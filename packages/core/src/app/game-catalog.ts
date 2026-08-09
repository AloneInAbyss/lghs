import type { GameAdapter } from "../ports/game-adapter.js";

/** Closed catalog of games available to `/start`. */
export class GameCatalog {
  private readonly byId: Map<string, GameAdapter>;

  constructor(adapters: readonly GameAdapter[]) {
    this.byId = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  }

  get(gameId: string): GameAdapter | undefined {
    return this.byId.get(gameId);
  }

  has(gameId: string): boolean {
    return this.byId.has(gameId);
  }
}
