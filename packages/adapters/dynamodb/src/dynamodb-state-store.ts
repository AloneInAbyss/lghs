import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  type NativeAttributeValue,
} from "@aws-sdk/lib-dynamodb";
import {
  DEFAULT_INSTALLATION_PK,
  type GameServerStatus,
  type InstallationState,
  type StateStore,
} from "@lghs/core";

const GAME_SERVER_STATUSES = new Set<GameServerStatus>([
  "stopped",
  "starting",
  "running",
  "stopping",
  "error",
]);

export interface DynamoDbStateStoreConfig {
  tableName: string;
  client?: DynamoDBDocumentClient;
  /** DynamoDB partition-key attribute name. Defaults to `pk`. */
  partitionKey?: string;
  /** Installation record key used by `get()`. Defaults to `INSTALL#default`. */
  installationPk?: string;
}

export class DynamoDbStateStore implements StateStore {
  private readonly tableName: string;
  private readonly client: DynamoDBDocumentClient;
  private readonly partitionKey: string;
  private readonly installationPk: string;

  constructor(config: DynamoDbStateStoreConfig) {
    this.tableName = config.tableName;
    this.partitionKey = config.partitionKey ?? "pk";
    this.installationPk = config.installationPk ?? DEFAULT_INSTALLATION_PK;
    this.client = config.client ?? DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async get(): Promise<InstallationState | undefined> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { [this.partitionKey]: this.installationPk },
      }),
    );

    if (result.Item === undefined) {
      return undefined;
    }

    return itemToState(result.Item, this.partitionKey);
  }

  async save(state: InstallationState): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: stateToItem(state, this.partitionKey),
      }),
    );
  }
}

function stateToItem(
  state: InstallationState,
  partitionKey: string,
): Record<string, NativeAttributeValue> {
  const item: Record<string, NativeAttributeValue> = {
    pk: state.pk,
    status: state.status,
    updatedAt: state.updatedAt,
  };

  if (state.gameId !== undefined) {
    item.gameId = state.gameId;
  }
  if (state.runtimeId !== undefined) {
    item.runtimeId = state.runtimeId;
  }
  if (state.publicIp !== undefined) {
    item.publicIp = state.publicIp;
  }
  if (state.connectionPort !== undefined) {
    item.connectionPort = state.connectionPort;
  }
  if (state.startedAt !== undefined) {
    item.startedAt = state.startedAt;
  }
  if (state.errorMessage !== undefined) {
    item.errorMessage = state.errorMessage;
  }

  item[partitionKey] = state.pk;
  return item;
}

function itemToState(
  item: Record<string, NativeAttributeValue>,
  partitionKey: string,
): InstallationState {
  const pkValue = item[partitionKey] ?? item.pk;
  if (typeof pkValue !== "string" || pkValue.length === 0) {
    throw new Error("DynamoDB item is missing a string partition key");
  }

  const status = item.status;
  if (typeof status !== "string" || !GAME_SERVER_STATUSES.has(status as GameServerStatus)) {
    throw new Error(`DynamoDB item has invalid status: ${String(status)}`);
  }

  const updatedAt = item.updatedAt;
  if (typeof updatedAt !== "string" || updatedAt.length === 0) {
    throw new Error("DynamoDB item is missing updatedAt");
  }

  const state: InstallationState = {
    pk: pkValue,
    status: status as GameServerStatus,
    updatedAt,
  };

  if (typeof item.gameId === "string") {
    state.gameId = item.gameId;
  }
  if (typeof item.runtimeId === "string") {
    state.runtimeId = item.runtimeId;
  }
  if (typeof item.publicIp === "string") {
    state.publicIp = item.publicIp;
  }
  if (typeof item.connectionPort === "number") {
    state.connectionPort = item.connectionPort;
  }
  if (typeof item.startedAt === "string") {
    state.startedAt = item.startedAt;
  }
  if (typeof item.errorMessage === "string") {
    state.errorMessage = item.errorMessage;
  }

  return state;
}
