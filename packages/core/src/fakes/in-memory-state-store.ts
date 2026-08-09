import {
  createInitialState,
  DEFAULT_INSTALLATION_PK,
  type InstallationState,
} from "../domain/installation-state.js";
import type { StateStore } from "../ports/state-store.js";

/** In-memory `StateStore` for unit tests and local wiring without AWS. */
export class InMemoryStateStore implements StateStore {
  private state: InstallationState | undefined;

  constructor(initial?: InstallationState) {
    this.state = initial;
  }

  async get(): Promise<InstallationState | undefined> {
    return this.state === undefined ? undefined : structuredClone(this.state);
  }

  async save(state: InstallationState): Promise<void> {
    this.state = structuredClone(state);
  }

  /** Test helper: seed a stopped installation if empty. */
  ensureInitial(pk: string = DEFAULT_INSTALLATION_PK, at?: string): InstallationState {
    if (this.state === undefined) {
      this.state = createInitialState(pk, at ?? new Date().toISOString());
    }
    return structuredClone(this.state);
  }
}
