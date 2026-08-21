import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, it } from "vitest";

import { LghsStack } from "./lghs-stack.js";

function synthTemplate(): Template {
  const app = new App();
  const stack = new LghsStack(app, "TestLghsStack", {
    minecraftJarUrl: "https://example.com/server.jar",
    discordClientId: "client-id",
    discordGuildId: "guild-id",
    discordAdminRoleId: "admin-role-id",
    amiId: "ami-0123456789abcdef0",
    ec2InstanceType: "t3.medium",
    imageTag: "test",
  });
  return Template.fromStack(stack);
}

describe("LghsStack", () => {
  it("creates DynamoDB, S3, ECS Service, and Discord alarm Lambda", () => {
    const template = synthTemplate();

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "lghs-state",
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
    });

    template.resourceCountIs("AWS::S3::Bucket", 1);

    template.hasResourceProperties("AWS::ECS::Service", {
      DesiredCount: 1,
      LaunchType: "FARGATE",
      NetworkConfiguration: {
        AwsvpcConfiguration: {
          AssignPublicIp: "ENABLED",
        },
      },
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Handler: "index.handler",
      Environment: {
        Variables: {
          WEBHOOK_SECRET_ARN: Match.anyValue(),
        },
      },
    });

    template.hasResourceProperties("AWS::SNS::Topic", {
      DisplayName: "LGHS alarms",
    });

    template.hasResourceProperties("AWS::EC2::SecurityGroup", {
      GroupDescription: "LGHS Minecraft Game Server (EC2)",
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          FromPort: 25565,
          ToPort: 25565,
          CidrIp: "0.0.0.0/0",
          IpProtocol: "tcp",
        }),
      ]),
    });

    template.hasResourceProperties("AWS::SecretsManager::Secret", {
      Name: "/lghs/minecraft-rcon-password",
      GenerateSecretString: Match.objectLike({
        GenerateStringKey: "password",
      }),
    });
  });
});
