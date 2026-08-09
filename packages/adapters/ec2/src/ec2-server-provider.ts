import {
  DescribeInstancesCommand,
  EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
  type Instance,
  type _InstanceType,
  type TagSpecification,
} from "@aws-sdk/client-ec2";
import type { BootstrapPlan, RuntimeInfo, RuntimeStatus, ServerProvider } from "@lghs/core";

import { serializeBootstrapPlanToUserData } from "./user-data.js";

export interface Ec2ServerProviderConfig {
  client?: EC2Client;
  amiId: string;
  instanceType: string;
  subnetId: string;
  securityGroupIds: string[];
  /** IAM instance profile name or Arn. */
  iamInstanceProfile: string;
  keyName?: string;
  /** S3 bucket used by user-data for save restore sync. */
  saveBucket: string;
  tags?: Record<string, string>;
  waitTimeoutMs?: number;
  /** Poll interval while waiting for running + public IP (overridable in tests). */
  pollIntervalMs?: number;
}

const DEFAULT_WAIT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;

function iamInstanceProfileField(value: string): { Arn: string } | { Name: string } {
  return value.startsWith("arn:") ? { Arn: value } : { Name: value };
}

function mapInstanceState(name: string | undefined): RuntimeStatus {
  switch (name) {
    case "pending":
      return "pending";
    case "running":
      return "running";
    case "stopping":
    case "shutting-down":
      return "stopping";
    case "stopped":
    case "terminated":
      return "terminated";
    default:
      return "unknown";
  }
}

function toRuntimeInfo(instance: Instance): RuntimeInfo {
  const runtimeId = instance.InstanceId;
  if (runtimeId === undefined || runtimeId === "") {
    throw new Error("EC2 instance is missing InstanceId");
  }
  const info: RuntimeInfo = {
    runtimeId,
    status: mapInstanceState(instance.State?.Name),
  };
  if (instance.PublicIpAddress !== undefined && instance.PublicIpAddress !== "") {
    info.publicIp = instance.PublicIpAddress;
  }
  return info;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class Ec2ServerProvider implements ServerProvider {
  private readonly client: EC2Client;
  private readonly amiId: string;
  private readonly instanceType: string;
  private readonly subnetId: string;
  private readonly securityGroupIds: string[];
  private readonly iamInstanceProfile: string;
  private readonly keyName: string | undefined;
  private readonly saveBucket: string;
  private readonly tags: Record<string, string>;
  private readonly waitTimeoutMs: number;
  private readonly pollIntervalMs: number;

  constructor(config: Ec2ServerProviderConfig) {
    this.client = config.client ?? new EC2Client({});
    this.amiId = config.amiId;
    this.instanceType = config.instanceType;
    this.subnetId = config.subnetId;
    this.securityGroupIds = config.securityGroupIds;
    this.iamInstanceProfile = config.iamInstanceProfile;
    this.keyName = config.keyName;
    this.saveBucket = config.saveBucket;
    this.tags = config.tags ?? {};
    this.waitTimeoutMs = config.waitTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  async start(plan: BootstrapPlan): Promise<RuntimeInfo> {
    const userData = serializeBootstrapPlanToUserData(plan, {
      saveBucket: this.saveBucket,
    });

    const tagSpecifications: TagSpecification[] = [];
    const tagEntries = Object.entries(this.tags);
    if (tagEntries.length > 0) {
      tagSpecifications.push({
        ResourceType: "instance",
        Tags: tagEntries.map(([Key, Value]) => ({ Key, Value })),
      });
    }

    const runResult = await this.client.send(
      new RunInstancesCommand({
        ImageId: this.amiId,
        InstanceType: this.instanceType as _InstanceType,
        MinCount: 1,
        MaxCount: 1,
        UserData: Buffer.from(userData, "utf8").toString("base64"),
        IamInstanceProfile: iamInstanceProfileField(this.iamInstanceProfile),
        InstanceInitiatedShutdownBehavior: "terminate",
        NetworkInterfaces: [
          {
            DeviceIndex: 0,
            AssociatePublicIpAddress: true,
            SubnetId: this.subnetId,
            Groups: this.securityGroupIds,
          },
        ],
        ...(this.keyName !== undefined ? { KeyName: this.keyName } : {}),
        ...(tagSpecifications.length > 0 ? { TagSpecifications: tagSpecifications } : {}),
      }),
    );

    const instanceId = runResult.Instances?.[0]?.InstanceId;
    if (instanceId === undefined || instanceId === "") {
      throw new Error("RunInstances did not return an InstanceId");
    }

    return this.waitUntilRunningWithPublicIp(instanceId);
  }

  async terminate(runtimeId: string): Promise<void> {
    await this.client.send(
      new TerminateInstancesCommand({
        InstanceIds: [runtimeId],
      }),
    );
  }

  async describe(runtimeId: string): Promise<RuntimeInfo> {
    const result = await this.client.send(
      new DescribeInstancesCommand({
        InstanceIds: [runtimeId],
      }),
    );
    const instance = result.Reservations?.[0]?.Instances?.[0];
    if (instance === undefined) {
      return { runtimeId, status: "unknown" };
    }
    return toRuntimeInfo(instance);
  }

  private async waitUntilRunningWithPublicIp(instanceId: string): Promise<RuntimeInfo> {
    const deadline = Date.now() + this.waitTimeoutMs;
    while (Date.now() < deadline) {
      const info = await this.describe(instanceId);
      if (info.status === "running" && info.publicIp !== undefined) {
        return info;
      }
      if (info.status === "terminated") {
        throw new Error(`EC2 instance ${instanceId} terminated before becoming ready`);
      }
      await sleep(this.pollIntervalMs);
    }
    throw new Error(
      `Timed out waiting for EC2 instance ${instanceId} to be running with a public IP`,
    );
  }
}
