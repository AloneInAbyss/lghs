import type { GameSession } from "@lghs/core";

import type { CreateRcon, RconLike } from "./rcon-like.js";

const DEFAULT_HEALTH_TIMEOUT_MS = 120_000;
const DEFAULT_HEALTH_POLL_MS = 1_000;

export interface MinecraftRconSessionOptions {
  host: string;
  port: number;
  password: string;
  createRcon: CreateRcon;
  pollIntervalMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Parse `list` replies such as "There are 2 of a max of 20 players online: ...". */
export function parsePlayerCount(listResponse: string): number {
  const match = /There are (\d+)/i.exec(listResponse);
  if (match?.[1] === undefined) {
    throw new Error(`Unable to parse player count from RCON list response: ${listResponse}`);
  }
  return Number.parseInt(match[1], 10);
}

export class MinecraftRconSession implements GameSession {
  private readonly host: string;
  private readonly port: number;
  private readonly password: string;
  private readonly createRcon: CreateRcon;
  private readonly pollIntervalMs: number;
  private client: RconLike | undefined;

  constructor(options: MinecraftRconSessionOptions) {
    this.host = options.host;
    this.port = options.port;
    this.password = options.password;
    this.createRcon = options.createRcon;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_HEALTH_POLL_MS;
  }

  async waitUntilHealthy(timeoutMs: number = DEFAULT_HEALTH_TIMEOUT_MS): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        await this.send("list");
        return;
      } catch (error) {
        lastError = error;
        await this.resetClient();
        await sleep(this.pollIntervalMs);
      }
    }
    const detail = lastError instanceof Error ? `: ${lastError.message}` : "";
    throw new Error(`Minecraft RCON health check timed out${detail}`);
  }

  async flush(): Promise<void> {
    try {
      await this.send("save-all flush");
    } catch {
      // Older vanilla builds may not support the flush subcommand.
      await this.send("save-all");
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.send("stop");
    } finally {
      await this.resetClient();
    }
  }

  async playerCount(): Promise<number> {
    const response = await this.send("list");
    return parsePlayerCount(response);
  }

  private async send(command: string): Promise<string> {
    const client = await this.ensureClient();
    return client.send(command);
  }

  private async ensureClient(): Promise<RconLike> {
    if (this.client === undefined) {
      this.client = await this.createRcon(this.host, this.port, this.password);
    }
    return this.client;
  }

  private async resetClient(): Promise<void> {
    const existing = this.client;
    this.client = undefined;
    if (existing !== undefined) {
      await existing.end();
    }
  }
}
