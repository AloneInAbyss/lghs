import type { GameAdapter, GameSession, RuntimeHandle } from "../ports/game-adapter.js";
import type { BootstrapPlan } from "../ports/server-provider.js";

export interface FakeGameAdapterOptions {
  id?: string;
  connectionPort?: number;
  savePaths?: readonly string[];
  healthyAfterMs?: number;
  failHealth?: boolean;
}

class InMemoryGameSession implements GameSession {
  private players = 0;

  constructor(
    private readonly options: {
      healthyAfterMs: number;
      failHealth: boolean;
    },
  ) {}

  async waitUntilHealthy(timeoutMs: number = 30_000): Promise<void> {
    if (this.options.failHealth) {
      throw new Error("health check failed");
    }
    if (this.options.healthyAfterMs > timeoutMs) {
      throw new Error("health check timed out");
    }
  }

  async flush(): Promise<void> {
    // no-op for fake
  }

  async shutdown(): Promise<void> {
    this.players = 0;
  }

  async playerCount(): Promise<number> {
    return this.players;
  }

  setPlayerCount(count: number): void {
    this.players = count;
  }
}

/** Minimal `GameAdapter` for tests without Minecraft/RCON. */
export class InMemoryGameAdapter implements GameAdapter {
  readonly id: string;
  readonly connectionPort: number;
  private readonly paths: readonly string[];
  private readonly healthyAfterMs: number;
  private readonly failHealth: boolean;
  lastSession: InMemoryGameSession | undefined;

  constructor(options: FakeGameAdapterOptions = {}) {
    this.id = options.id ?? "fake-game";
    this.connectionPort = options.connectionPort ?? 25565;
    this.paths = options.savePaths ?? ["world/", "server.properties"];
    this.healthyAfterMs = options.healthyAfterMs ?? 0;
    this.failHealth = options.failHealth ?? false;
  }

  savePaths(): readonly string[] {
    return this.paths;
  }

  bootstrapPlan(options?: { restoreSave?: boolean }): BootstrapPlan {
    return {
      workingDirectory: "/opt/game",
      setupCommands: ["echo setup"],
      artifacts: [
        {
          source: { type: "url", url: "https://example.invalid/game.jar" },
          destinationPath: "game.jar",
        },
      ],
      restoreSave: options?.restoreSave ?? true,
      startCommand: "java -jar game.jar",
      env: { GAME_ID: this.id },
    };
  }

  async connect(_runtime: RuntimeHandle): Promise<GameSession> {
    const session = new InMemoryGameSession({
      healthyAfterMs: this.healthyAfterMs,
      failHealth: this.failHealth,
    });
    this.lastSession = session;
    return session;
  }
}
