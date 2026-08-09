import type { InstallationState } from "../domain/installation-state.js";
import type { Clock } from "../ports/clock.js";
import type { SaveStorage } from "../ports/save-storage.js";
import type { ServerProvider } from "../ports/server-provider.js";
import type { StateStore } from "../ports/state-store.js";
import type { GameCatalog } from "./game-catalog.js";

/** Ports required by lifecycle use cases (ACL stays in the Discord adapter). */
export interface AppDeps {
  stateStore: StateStore;
  serverProvider: ServerProvider;
  saveStorage: SaveStorage;
  games: GameCatalog;
  clock: Clock;
}

export type ConnectionInfo = {
  gameId: string;
  ip: string;
  port: number;
};

export type StartFailureCode =
  "INVALID_STATE" | "UNKNOWN_GAME" | "NO_GAME_SELECTED" | "START_FAILED" | "MISSING_PUBLIC_IP";

export type StopFailureCode = "INVALID_STATE" | "UNKNOWN_GAME" | "STOP_FAILED";

export type StartResult =
  | { ok: true; state: InstallationState; connection: ConnectionInfo }
  | { ok: false; code: StartFailureCode; message: string; state: InstallationState };

export type StopResult =
  | { ok: true; state: InstallationState }
  | { ok: false; code: StopFailureCode; message: string; state: InstallationState };

export type StatusResult = {
  state: InstallationState;
  connection?: ConnectionInfo;
};
