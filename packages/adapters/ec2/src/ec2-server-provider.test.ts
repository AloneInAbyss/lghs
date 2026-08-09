import {
  DescribeInstancesCommand,
  type EC2Client,
  RunInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import type { BootstrapPlan } from "@lghs/core";
import { describe, expect, it, vi } from "vitest";

import { Ec2ServerProvider } from "./ec2-server-provider.js";

function samplePlan(): BootstrapPlan {
  return {
    workingDirectory: "/opt/minecraft",
    setupCommands: [],
    artifacts: [],
    restoreSave: false,
    startCommand: "java -jar server.jar nogui",
    env: { LGHS_GAME_ID: "minecraft" },
  };
}

describe("Ec2ServerProvider", () => {
  it("start runs instances, waits for public IP, and returns runtime info", async () => {
    const send = vi.fn();
    send
      .mockResolvedValueOnce({
        Instances: [{ InstanceId: "i-abc123" }],
      })
      .mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [
              {
                InstanceId: "i-abc123",
                State: { Name: "pending" },
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [
              {
                InstanceId: "i-abc123",
                State: { Name: "running" },
                PublicIpAddress: "203.0.113.50",
              },
            ],
          },
        ],
      });

    const provider = new Ec2ServerProvider({
      client: { send } as unknown as EC2Client,
      amiId: "ami-123",
      instanceType: "t3.medium",
      subnetId: "subnet-1",
      securityGroupIds: ["sg-1"],
      iamInstanceProfile: "lghs-game",
      saveBucket: "lghs-saves",
      tags: { Project: "lghs" },
      waitTimeoutMs: 10_000,
      pollIntervalMs: 1,
    });

    const started = await provider.start(samplePlan());

    expect(started).toEqual({
      runtimeId: "i-abc123",
      publicIp: "203.0.113.50",
      status: "running",
    });

    expect(send).toHaveBeenCalled();
    const runCommand = send.mock.calls[0]?.[0];
    expect(runCommand).toBeInstanceOf(RunInstancesCommand);
    expect(runCommand.input.ImageId).toBe("ami-123");
    expect(runCommand.input.InstanceInitiatedShutdownBehavior).toBe("terminate");
    expect(runCommand.input.NetworkInterfaces?.[0]?.AssociatePublicIpAddress).toBe(true);
    expect(runCommand.input.IamInstanceProfile).toEqual({ Name: "lghs-game" });
    expect(Buffer.from(runCommand.input.UserData ?? "", "base64").toString("utf8")).toContain(
      "java -jar server.jar nogui",
    );
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(DescribeInstancesCommand);
    expect(send.mock.calls[2]?.[0]).toBeInstanceOf(DescribeInstancesCommand);
  });

  it("terminate calls TerminateInstances", async () => {
    const send = vi.fn().mockResolvedValue({});
    const provider = new Ec2ServerProvider({
      client: { send } as unknown as EC2Client,
      amiId: "ami-123",
      instanceType: "t3.medium",
      subnetId: "subnet-1",
      securityGroupIds: ["sg-1"],
      iamInstanceProfile: "arn:aws:iam::123456789012:instance-profile/lghs",
      saveBucket: "lghs-saves",
    });

    await provider.terminate("i-abc123");

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(TerminateInstancesCommand);
    expect(command.input.InstanceIds).toEqual(["i-abc123"]);
  });

  it("describe maps instance state to RuntimeStatus", async () => {
    const send = vi.fn().mockResolvedValue({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: "i-abc123",
              State: { Name: "shutting-down" },
              PublicIpAddress: "203.0.113.50",
            },
          ],
        },
      ],
    });
    const provider = new Ec2ServerProvider({
      client: { send } as unknown as EC2Client,
      amiId: "ami-123",
      instanceType: "t3.medium",
      subnetId: "subnet-1",
      securityGroupIds: ["sg-1"],
      iamInstanceProfile: "lghs-game",
      saveBucket: "lghs-saves",
    });

    await expect(provider.describe("i-abc123")).resolves.toEqual({
      runtimeId: "i-abc123",
      publicIp: "203.0.113.50",
      status: "stopping",
    });
  });
});
