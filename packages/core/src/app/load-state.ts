import {
  createInitialState,
  DEFAULT_INSTALLATION_PK,
  type InstallationState,
} from "../domain/installation-state.js";
import type { StateStore } from "../ports/state-store.js";

export async function loadOrInitState(
  store: StateStore,
  now: string,
  pk: string = DEFAULT_INSTALLATION_PK,
): Promise<InstallationState> {
  const existing = await store.get();
  if (existing !== undefined) {
    return existing;
  }
  const initial = createInitialState(pk, now);
  await store.save(initial);
  return initial;
}
