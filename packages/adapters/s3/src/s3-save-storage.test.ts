import {
  GetCommandInvocationCommand,
  SendCommandCommand,
  type SSMClient,
} from "@aws-sdk/client-ssm";
import { describe, expect, it, vi } from "vitest";

import { S3SaveStorage } from "./s3-save-storage.js";

function mockSsm(send: ReturnType<typeof vi.fn>): SSMClient {
  return { send } as unknown as SSMClient;
}

describe("S3SaveStorage", () => {
  it("download runs s3 sync via SSM and waits for success", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ Command: { CommandId: "cmd-1" } })
      .mockResolvedValueOnce({ Status: "Success" });

    const storage = new S3SaveStorage({
      bucket: "lghs-saves",
      ssmClient: mockSsm(send),
      pollIntervalMs: 0,
    });

    await storage.download("minecraft", ["world"], {
      runtimeId: "i-abc",
      workingDirectory: "/opt/game",
    });

    expect(send).toHaveBeenCalledTimes(2);

    const sendCommand = send.mock.calls[0]?.[0];
    expect(sendCommand).toBeInstanceOf(SendCommandCommand);
    expect(sendCommand.input.InstanceIds).toEqual(["i-abc"]);
    expect(sendCommand.input.DocumentName).toBe("AWS-RunShellScript");
    const script = sendCommand.input.Parameters?.commands?.[0] as string;
    expect(script).toContain("aws s3 sync 's3://lghs-saves/saves/minecraft/' '/opt/game/' || true");

    const getInvocation = send.mock.calls[1]?.[0];
    expect(getInvocation).toBeInstanceOf(GetCommandInvocationCommand);
    expect(getInvocation.input).toEqual({
      CommandId: "cmd-1",
      InstanceId: "i-abc",
    });
  });

  it("upload syncs each relative path via SSM", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ Command: { CommandId: "cmd-2" } })
      .mockResolvedValueOnce({ Status: "Success" });

    const storage = new S3SaveStorage({
      bucket: "lghs-saves",
      ssmClient: mockSsm(send),
      keyPrefix: "saves/",
      pollIntervalMs: 0,
    });

    await storage.upload("minecraft", ["world", "server.properties"], {
      runtimeId: "i-xyz",
      workingDirectory: "/opt/game",
    });

    const sendCommand = send.mock.calls[0]?.[0];
    const script = sendCommand.input.Parameters?.commands?.[0] as string;
    expect(script).toContain("src='/opt/game/world'");
    expect(script).toContain("dest='s3://lghs-saves/saves/minecraft/world'");
    expect(script).toContain("src='/opt/game/server.properties'");
    expect(script).toContain("dest='s3://lghs-saves/saves/minecraft/server.properties'");
    expect(script).toContain('aws s3 sync "$src"');
    expect(script).toContain('aws s3 cp "$src" "$dest"');
  });

  it("upload is a no-op when relativePaths is empty", async () => {
    const send = vi.fn();
    const storage = new S3SaveStorage({
      bucket: "lghs-saves",
      ssmClient: mockSsm(send),
    });

    await storage.upload("minecraft", [], {
      runtimeId: "i-abc",
      workingDirectory: "/opt/game",
    });

    expect(send).not.toHaveBeenCalled();
  });

  it("throws when SSM command fails", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ Command: { CommandId: "cmd-fail" } })
      .mockResolvedValueOnce({
        Status: "Failed",
        StandardErrorContent: "access denied",
      });

    const storage = new S3SaveStorage({
      bucket: "lghs-saves",
      ssmClient: mockSsm(send),
      pollIntervalMs: 0,
    });

    await expect(
      storage.download("minecraft", [], {
        runtimeId: "i-abc",
        workingDirectory: "/opt/game",
      }),
    ).rejects.toThrow(/access denied/);
  });
});
