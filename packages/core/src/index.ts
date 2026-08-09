export {
  createInitialState,
  DEFAULT_INSTALLATION_PK,
  type GameServerStatus,
  type InstallationState,
} from "./domain/installation-state.js";

export { InvalidTransitionError, transition, type LifecycleEvent } from "./domain/lifecycle.js";

export type { Clock } from "./ports/clock.js";
export { systemClock } from "./ports/clock.js";
export type { StateStore } from "./ports/state-store.js";
export type {
  BootstrapArtifact,
  BootstrapArtifactSource,
  BootstrapPlan,
  RuntimeInfo,
  RuntimeStatus,
  ServerProvider,
} from "./ports/server-provider.js";
export type { SaveStorage, SaveSyncContext } from "./ports/save-storage.js";
export type { GameAdapter, GameSession, RuntimeHandle } from "./ports/game-adapter.js";

export { GameCatalog } from "./app/game-catalog.js";
export { startServer, type StartServerInput } from "./app/start-server.js";
export { stopServer } from "./app/stop-server.js";
export { getStatus } from "./app/get-status.js";
export type {
  AppDeps,
  ConnectionInfo,
  StartFailureCode,
  StartResult,
  StatusResult,
  StopFailureCode,
  StopResult,
} from "./app/types.js";

export { InMemoryStateStore } from "./fakes/in-memory-state-store.js";
export { InMemoryServerProvider } from "./fakes/in-memory-server-provider.js";
export { InMemorySaveStorage } from "./fakes/in-memory-save-storage.js";
export {
  InMemoryGameAdapter,
  type FakeGameAdapterOptions,
} from "./fakes/in-memory-game-adapter.js";
