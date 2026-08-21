import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy, SecretValue, Stack } from "aws-cdk-lib";
import type { StackProps } from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";

const MINECRAFT_GAME_PORT = 25565;
const MINECRAFT_RCON_PORT = 25575;

const HERE = path.dirname(fileURLToPath(import.meta.url));

export type LghsStackProps = StackProps & {
  minecraftJarUrl: string;
  discordClientId: string;
  discordGuildId: string;
  discordAdminRoleId: string;
  ec2InstanceType?: string;
  amiId?: string;
  imageTag?: string;
  /** When true, state table / saves bucket / logs may be destroyed on stack delete. */
  dangerDeleteData?: boolean;
};

export class LghsStack extends Stack {
  constructor(scope: Construct, id: string, props: LghsStackProps) {
    super(scope, id, props);

    const ec2InstanceType = props.ec2InstanceType ?? "t3.medium";
    const imageTag = props.imageTag ?? "latest";
    const dangerDeleteData = props.dangerDeleteData ?? false;
    const dataRemovalPolicy = dangerDeleteData ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    const publicSubnet = vpc.publicSubnets[0];
    if (!publicSubnet) {
      throw new Error("VPC must have at least one public subnet");
    }

    const amiId =
      props.amiId ??
      ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
      }).getImage(this).imageId;

    const stateTable = new dynamodb.Table(this, "StateTable", {
      tableName: "lghs-state",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: dataRemovalPolicy,
    });

    const saveBucket = new s3.Bucket(this, "SaveBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: dataRemovalPolicy,
      ...(dangerDeleteData ? { autoDeleteObjects: true } : {}),
    });

    const ecrRepository = new ecr.Repository(this, "ControlPlaneRepo", {
      repositoryName: "lghs-control-plane",
      imageScanOnPush: true,
      removalPolicy: dataRemovalPolicy,
      emptyOnDelete: dangerDeleteData,
    });

    const controlPlaneSg = new ec2.SecurityGroup(this, "ControlPlaneSg", {
      vpc,
      description: "LGHS Control Plane (Fargate)",
      allowAllOutbound: true,
    });

    const gameServerSg = new ec2.SecurityGroup(this, "GameServerSg", {
      vpc,
      description: "LGHS Minecraft Game Server (EC2)",
      allowAllOutbound: true,
    });
    gameServerSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(MINECRAFT_GAME_PORT),
      "Minecraft Java players",
    );
    gameServerSg.addIngressRule(
      controlPlaneSg,
      ec2.Port.tcp(MINECRAFT_RCON_PORT),
      "RCON from Control Plane",
    );

    const gameServerRole = new iam.Role(this, "GameServerRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: "EC2 Game Server instance role",
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")],
    });
    saveBucket.grantReadWrite(gameServerRole);
    gameServerRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "OptionalEc2Describe",
        actions: ["ec2:DescribeInstances", "ec2:DescribeInstanceStatus"],
        resources: ["*"],
      }),
    );

    const gameServerInstanceProfile = new iam.InstanceProfile(this, "GameServerInstanceProfile", {
      role: gameServerRole,
    });

    // Placeholders — set real values via console/CLI after deploy (do not commit secrets).
    const discordTokenSecret = new secretsmanager.Secret(this, "DiscordTokenSecret", {
      secretName: "/lghs/discord-token",
      description: "Discord bot token (replace REPLACE_ME after deploy)",
      secretStringValue: SecretValue.unsafePlainText("REPLACE_ME"),
    });

    const rconPasswordSecret = new secretsmanager.Secret(this, "RconPasswordSecret", {
      secretName: "/lghs/minecraft-rcon-password",
      description: "Minecraft RCON password",
      generateSecretString: {
        passwordLength: 32,
        excludePunctuation: true,
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "password",
      },
    });

    const discordAlarmWebhookSecret = new secretsmanager.Secret(this, "DiscordAlarmWebhookSecret", {
      secretName: "/lghs/discord-alarm-webhook",
      description: "Discord webhook URL for CloudWatch alarms (replace REPLACE_ME)",
      secretStringValue: SecretValue.unsafePlainText("REPLACE_ME"),
    });

    const taskRole = new iam.Role(this, "ControlPlaneTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Fargate task role for LGHS Control Plane",
    });
    stateTable.grantReadWriteData(taskRole);
    saveBucket.grantReadWrite(taskRole);
    discordTokenSecret.grantRead(taskRole);
    rconPasswordSecret.grantRead(taskRole);

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "Ec2Lifecycle",
        actions: [
          "ec2:RunInstances",
          "ec2:TerminateInstances",
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus",
          "ec2:DescribeImages",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeVpcs",
          "ec2:CreateTags",
        ],
        resources: ["*"],
      }),
    );
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "PassGameServerRole",
        actions: ["iam:PassRole"],
        resources: [gameServerRole.roleArn],
        conditions: {
          StringEquals: {
            "iam:PassedToService": "ec2.amazonaws.com",
          },
        },
      }),
    );
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SsmGameServer",
        actions: ["ssm:SendCommand", "ssm:GetCommandInvocation"],
        resources: ["*"],
      }),
    );

    const executionRole = new iam.Role(this, "ControlPlaneExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Fargate execution role (pull image + inject secrets)",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
      ],
    });
    ecrRepository.grantPull(executionRole);
    discordTokenSecret.grantRead(executionRole);
    rconPasswordSecret.grantRead(executionRole);

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: "lghs",
    });

    const logGroup = new logs.LogGroup(this, "ControlPlaneLogs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: dataRemovalPolicy,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole,
      executionRole,
    });

    taskDefinition.addContainer("control-plane", {
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository, imageTag),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "control-plane",
        logGroup,
      }),
      environment: {
        AWS_REGION: this.region,
        LGHS_STATE_TABLE: stateTable.tableName,
        LGHS_SAVE_BUCKET: saveBucket.bucketName,
        LGHS_EC2_AMI_ID: amiId,
        LGHS_EC2_INSTANCE_TYPE: ec2InstanceType,
        LGHS_EC2_SUBNET_ID: publicSubnet.subnetId,
        LGHS_EC2_SECURITY_GROUP_IDS: gameServerSg.securityGroupId,
        LGHS_EC2_IAM_INSTANCE_PROFILE: gameServerInstanceProfile.instanceProfileName,
        LGHS_MINECRAFT_JAR_URL: props.minecraftJarUrl,
        LGHS_MINECRAFT_RCON_PORT: String(MINECRAFT_RCON_PORT),
        DISCORD_CLIENT_ID: props.discordClientId,
        DISCORD_ADMIN_ROLE_ID: props.discordAdminRoleId,
        ...(props.discordGuildId.trim() !== "" ? { DISCORD_GUILD_ID: props.discordGuildId } : {}),
      },
      secrets: {
        DISCORD_TOKEN: ecs.Secret.fromSecretsManager(discordTokenSecret),
        LGHS_MINECRAFT_RCON_PASSWORD: ecs.Secret.fromSecretsManager(rconPasswordSecret, "password"),
      },
    });

    const service = new ecs.FargateService(this, "ControlPlaneService", {
      cluster,
      serviceName: "lghs-control-plane",
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [controlPlaneSg],
      circuitBreaker: { rollback: true },
      // Single-task service: allow replace without needing a second task.
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
    });

    const controlPlaneDownAlarm = new cloudwatch.Alarm(this, "ControlPlaneDownAlarm", {
      alarmDescription: "LGHS Control Plane has fewer than 1 running task",
      metric: new cloudwatch.Metric({
        namespace: "AWS/ECS",
        metricName: "RunningTaskCount",
        dimensionsMap: {
          ClusterName: cluster.clusterName,
          ServiceName: service.serviceName,
        },
        statistic: "Average",
        period: Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    const alarmTopic = new sns.Topic(this, "AlarmTopic", {
      displayName: "LGHS alarms",
    });
    controlPlaneDownAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    const discordAlarmFn = new NodejsFunction(this, "DiscordAlarmFn", {
      entry: path.join(HERE, "../lambda/discord-alarm/index.mjs"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      memorySize: 128,
      description: "Posts CloudWatch alarm notifications to Discord webhook",
      environment: {
        WEBHOOK_SECRET_ARN: discordAlarmWebhookSecret.secretArn,
      },
      // Node 18+ runtimes do not ship AWS SDK v3; bundle it into the asset.
      bundling: {
        externalModules: [],
      },
    });
    discordAlarmWebhookSecret.grantRead(discordAlarmFn);
    alarmTopic.addSubscription(new snsSubscriptions.LambdaSubscription(discordAlarmFn));

    new cdk.CfnOutput(this, "StateTableName", { value: stateTable.tableName });
    new cdk.CfnOutput(this, "SaveBucketName", { value: saveBucket.bucketName });
    new cdk.CfnOutput(this, "Ec2AmiId", { value: amiId });
    new cdk.CfnOutput(this, "Ec2InstanceType", { value: ec2InstanceType });
    new cdk.CfnOutput(this, "Ec2SubnetId", { value: publicSubnet.subnetId });
    new cdk.CfnOutput(this, "Ec2SecurityGroupId", {
      value: gameServerSg.securityGroupId,
    });
    new cdk.CfnOutput(this, "Ec2IamInstanceProfileName", {
      value: gameServerInstanceProfile.instanceProfileName,
    });
    new cdk.CfnOutput(this, "EcrRepositoryUri", { value: ecrRepository.repositoryUri });
    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "ServiceName", { value: service.serviceName });
    new cdk.CfnOutput(this, "DiscordTokenSecretArn", {
      value: discordTokenSecret.secretArn,
    });
    new cdk.CfnOutput(this, "MinecraftRconPasswordSecretArn", {
      value: rconPasswordSecret.secretArn,
    });
    new cdk.CfnOutput(this, "DiscordAlarmWebhookSecretArn", {
      value: discordAlarmWebhookSecret.secretArn,
    });
  }
}
