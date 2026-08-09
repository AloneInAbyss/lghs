import type { S3Client } from "@aws-sdk/client-s3";
import { GetCommandInvocationCommand, SSMClient, SendCommandCommand } from "@aws-sdk/client-ssm";
import type { SaveStorage, SaveSyncContext } from "@lghs/core";

const DEFAULT_KEY_PREFIX = "saves/";
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 60;

export interface S3SaveStorageConfig {
  bucket: string;
  /** Optional; sync runs on the runtime via SSM (`aws s3 sync`), not through this client. */
  s3Client?: S3Client;
  ssmClient?: SSMClient;
  /** Prefix before `${gameId}/`. Defaults to `saves/`. */
  keyPrefix?: string;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export class S3SaveStorage implements SaveStorage {
  private readonly bucket: string;
  private readonly ssmClient: SSMClient;
  private readonly keyPrefix: string;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;

  constructor(config: S3SaveStorageConfig) {
    this.bucket = config.bucket;
    this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxPollAttempts = config.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
    this.ssmClient = config.ssmClient ?? new SSMClient({});
  }

  /**
   * Restore the game prefix onto the runtime.
   * Start also restores via user-data; this path supports reconcile/tools.
   */
  async download(
    gameId: string,
    _relativePaths: readonly string[],
    context: SaveSyncContext,
  ): Promise<void> {
    const prefix = this.objectPrefix(gameId);
    const script = [
      "set -eu",
      `aws s3 sync ${shellQuote(`s3://${this.bucket}/${prefix}`)} ${shellQuote(ensureTrailingSlash(context.workingDirectory))} || true`,
    ].join("\n");

    await this.runOnRuntime(context.runtimeId, script);
  }

  async upload(
    gameId: string,
    relativePaths: readonly string[],
    context: SaveSyncContext,
  ): Promise<void> {
    if (relativePaths.length === 0) {
      return;
    }

    const prefix = this.objectPrefix(gameId);
    const lines = ["set -eu"];

    for (const relativePath of relativePaths) {
      const src = joinPosix(context.workingDirectory, relativePath);
      const dest = `s3://${this.bucket}/${prefix}${relativePath}`;
      lines.push(
        `src=${shellQuote(src)}`,
        `dest=${shellQuote(dest)}`,
        'if [ -d "$src" ]; then',
        '  aws s3 sync "$src" "${dest%/}/"',
        'elif [ -f "$src" ]; then',
        '  aws s3 cp "$src" "$dest"',
        "fi",
      );
    }

    await this.runOnRuntime(context.runtimeId, lines.join("\n"));
  }

  private objectPrefix(gameId: string): string {
    return `${this.keyPrefix}${gameId}/`;
  }

  private async runOnRuntime(runtimeId: string, script: string): Promise<void> {
    const sent = await this.ssmClient.send(
      new SendCommandCommand({
        InstanceIds: [runtimeId],
        DocumentName: "AWS-RunShellScript",
        Parameters: {
          commands: [script],
        },
      }),
    );

    const commandId = sent.Command?.CommandId;
    if (commandId === undefined || commandId.length === 0) {
      throw new Error("SSM SendCommand did not return a CommandId");
    }

    await this.waitForSuccess(commandId, runtimeId);
  }

  private async waitForSuccess(commandId: string, instanceId: string): Promise<void> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      try {
        const invocation = await this.ssmClient.send(
          new GetCommandInvocationCommand({
            CommandId: commandId,
            InstanceId: instanceId,
          }),
        );

        const status = invocation.Status;
        if (status === "Success") {
          return;
        }
        if (status === "Cancelled" || status === "TimedOut" || status === "Failed") {
          const detail = invocation.StandardErrorContent?.trim() || status;
          throw new Error(`SSM command ${commandId} ended with ${detail}`);
        }
      } catch (error) {
        if (!isInvocationNotReady(error)) {
          throw error;
        }
      }

      if (attempt + 1 < this.maxPollAttempts) {
        await sleep(this.pollIntervalMs);
      }
    }

    throw new Error(
      `SSM command ${commandId} did not reach a terminal state after ${this.maxPollAttempts} attempts`,
    );
  }
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

function joinPosix(base: string, relativePath: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedRel = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  return `${normalizedBase}/${normalizedRel}`;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isInvocationNotReady(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  return "name" in error && error.name === "InvocationDoesNotExist";
}
