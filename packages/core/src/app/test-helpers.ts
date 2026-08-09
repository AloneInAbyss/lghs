import { InMemoryGameAdapter } from "../fakes/in-memory-game-adapter.js";
import { InMemorySaveStorage } from "../fakes/in-memory-save-storage.js";
import { InMemoryServerProvider } from "../fakes/in-memory-server-provider.js";
import { InMemoryStateStore } from "../fakes/in-memory-state-store.js";
import type { Clock } from "../ports/clock.js";
import { GameCatalog } from "./game-catalog.js";
import type { AppDeps } from "./types.js";

export class SequenceClock implements Clock {
  private index = 0;

  constructor(private readonly timestamps: readonly string[]) {}

  now(): string {
    const value = this.timestamps[this.index] ?? this.timestamps[this.timestamps.length - 1];
    if (value === undefined) {
      throw new Error("SequenceClock has no timestamps");
    }
    this.index += 1;
    return value;
  }
}

export type TestDeps = AppDeps & {
  stateStore: InMemoryStateStore;
  serverProvider: InMemoryServerProvider;
  saveStorage: InMemorySaveStorage;
};

export function createTestDeps(options?: { failHealth?: boolean; gameId?: string }): TestDeps {
  const game = new InMemoryGameAdapter({
    id: options?.gameId ?? "minecraft",
    failHealth: options?.failHealth ?? false,
  });

  return {
    stateStore: new InMemoryStateStore(),
    serverProvider: new InMemoryServerProvider(),
    saveStorage: new InMemorySaveStorage(),
    games: new GameCatalog([game]),
    clock: new SequenceClock([
      "2026-08-09T12:00:00.000Z",
      "2026-08-09T12:01:00.000Z",
      "2026-08-09T12:02:00.000Z",
      "2026-08-09T12:03:00.000Z",
      "2026-08-09T12:04:00.000Z",
      "2026-08-09T12:05:00.000Z",
      "2026-08-09T12:06:00.000Z",
      "2026-08-09T12:07:00.000Z",
    ]),
  };
}
