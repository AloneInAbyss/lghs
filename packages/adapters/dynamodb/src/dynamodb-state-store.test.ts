import { GetCommand, PutCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DEFAULT_INSTALLATION_PK, type InstallationState } from "@lghs/core";
import { describe, expect, it, vi } from "vitest";

import { DynamoDbStateStore } from "./dynamodb-state-store.js";

function mockClient(send: ReturnType<typeof vi.fn>): DynamoDBDocumentClient {
  return { send } as unknown as DynamoDBDocumentClient;
}

describe("DynamoDbStateStore", () => {
  it("get returns undefined when the item is missing", async () => {
    const send = vi.fn().mockResolvedValue({});
    const store = new DynamoDbStateStore({
      tableName: "lghs-state",
      client: mockClient(send),
    });

    await expect(store.get()).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledOnce();
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(GetCommand);
    expect(command.input).toEqual({
      TableName: "lghs-state",
      Key: { pk: DEFAULT_INSTALLATION_PK },
    });
  });

  it("get maps a full item and omits absent optional fields", async () => {
    const send = vi.fn().mockResolvedValue({
      Item: {
        pk: DEFAULT_INSTALLATION_PK,
        status: "running",
        gameId: "minecraft",
        runtimeId: "i-abc",
        publicIp: "203.0.113.10",
        connectionPort: 25565,
        startedAt: "2026-08-08T12:00:00.000Z",
        updatedAt: "2026-08-08T12:01:00.000Z",
      },
    });
    const store = new DynamoDbStateStore({
      tableName: "lghs-state",
      client: mockClient(send),
    });

    await expect(store.get()).resolves.toEqual({
      pk: DEFAULT_INSTALLATION_PK,
      status: "running",
      gameId: "minecraft",
      runtimeId: "i-abc",
      publicIp: "203.0.113.10",
      connectionPort: 25565,
      startedAt: "2026-08-08T12:00:00.000Z",
      updatedAt: "2026-08-08T12:01:00.000Z",
    } satisfies InstallationState);
  });

  it("get uses configured installationPk and partitionKey", async () => {
    const send = vi.fn().mockResolvedValue({
      Item: {
        installKey: "INSTALL#guild-1",
        status: "stopped",
        updatedAt: "2026-08-08T12:00:00.000Z",
      },
    });
    const store = new DynamoDbStateStore({
      tableName: "lghs-state",
      client: mockClient(send),
      partitionKey: "installKey",
      installationPk: "INSTALL#guild-1",
    });

    await expect(store.get()).resolves.toEqual({
      pk: "INSTALL#guild-1",
      status: "stopped",
      updatedAt: "2026-08-08T12:00:00.000Z",
    });

    const command = send.mock.calls[0]?.[0];
    expect(command.input.Key).toEqual({ installKey: "INSTALL#guild-1" });
  });

  it("save puts a full item without undefined optional fields", async () => {
    const send = vi.fn().mockResolvedValue({});
    const store = new DynamoDbStateStore({
      tableName: "lghs-state",
      client: mockClient(send),
    });

    const state: InstallationState = {
      pk: DEFAULT_INSTALLATION_PK,
      status: "stopped",
      updatedAt: "2026-08-08T12:00:00.000Z",
    };

    await store.save(state);

    expect(send).toHaveBeenCalledOnce();
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutCommand);
    expect(command.input).toEqual({
      TableName: "lghs-state",
      Item: {
        pk: DEFAULT_INSTALLATION_PK,
        status: "stopped",
        updatedAt: "2026-08-08T12:00:00.000Z",
      },
    });
    expect(command.input.Item).not.toHaveProperty("gameId");
    expect(command.input.Item).not.toHaveProperty("errorMessage");
  });

  it("save includes present optional fields", async () => {
    const send = vi.fn().mockResolvedValue({});
    const store = new DynamoDbStateStore({
      tableName: "lghs-state",
      client: mockClient(send),
    });

    await store.save({
      pk: DEFAULT_INSTALLATION_PK,
      status: "error",
      gameId: "minecraft",
      errorMessage: "bootstrap failed",
      updatedAt: "2026-08-08T12:00:00.000Z",
    });

    const command = send.mock.calls[0]?.[0];
    expect(command.input.Item).toEqual({
      pk: DEFAULT_INSTALLATION_PK,
      status: "error",
      gameId: "minecraft",
      errorMessage: "bootstrap failed",
      updatedAt: "2026-08-08T12:00:00.000Z",
    });
  });
});
