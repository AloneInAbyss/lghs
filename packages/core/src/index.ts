export {
  createInitialState,
  DEFAULT_INSTALLATION_PK,
  type GameServerStatus,
  type InstallationState,
} from "./domain/installation-state.js";

export { InvalidTransitionError, transition, type LifecycleEvent } from "./domain/lifecycle.js";

export type { StateStore } from "./ports/state-store.js";
export type {
  BootstrapArtifact,
  BootstrapArtifactSource,
  BootstrapPlan,
  RuntimeInfo,
  RuntimeStatus,
  ServerProvider,
} from "./ports/server-provider.js";
export type { SaveStorage } from "./ports/save-storage.js";
export type { GameAdapter, GameSession, RuntimeHandle } from "./ports/game-adapter.js";

export { InMemoryStateStore } from "./fakes/in-memory-state-store.js";
export { InMemoryServerProvider } from "./fakes/in-memory-server-provider.js";
export { InMemorySaveStorage } from "./fakes/in-memory-save-storage.js";
export {
  InMemoryGameAdapter,
  type FakeGameAdapterOptions,
} from "./fakes/in-memory-game-adapter.js";
