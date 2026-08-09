import type { InstallationState } from "../domain/installation-state.js";

/** Persist and read the single installation lifecycle record. */
export interface StateStore {
  get(): Promise<InstallationState | undefined>;
  save(state: InstallationState): Promise<void>;
}
