import { InvalidTransitionError, transition } from "../domain/lifecycle.js";
import type { InstallationState } from "../domain/installation-state.js";
import { loadOrInitState } from "./load-state.js";
import type { AppDeps, StopResult } from "./types.js";

/**
 * Orchestrates `/stop`: flush/shutdown when possible, upload saves, terminate runtime.
 * Permission checks belong to the Discord adapter, not here.
 */
export async function stopServer(deps: AppDeps): Promise<StopResult> {
  const at = deps.clock.now();
  let state = await loadOrInitState(deps.stateStore, at);

  try {
    state = transition(state, { type: "STOP_REQUESTED", at });
  } catch (error) {
    if (error instanceof InvalidTransitionError) {
      return {
        ok: false,
        code: "INVALID_STATE",
        message: error.message,
        state,
      };
    }
    throw error;
  }
  await deps.stateStore.save(state);

  try {
    const gameId = state.gameId;
    const runtimeId = state.runtimeId;
    const publicIp = state.publicIp;

    if (gameId !== undefined && runtimeId !== undefined && publicIp !== undefined) {
      const adapter = deps.games.get(gameId);
      if (adapter === undefined) {
        state = await failStop(deps, state, `Unknown game: ${gameId}`);
        return {
          ok: false,
          code: "UNKNOWN_GAME",
          message: `Unknown game: ${gameId}`,
          state,
        };
      }

      const session = await adapter.connect({ runtimeId, publicIp });
      await session.flush();
      await session.shutdown();
      await deps.saveStorage.upload(gameId, adapter.savePaths());
    } else if (gameId !== undefined) {
      // Error/reconcile without a supervisable session: still try to persist known paths.
      const adapter = deps.games.get(gameId);
      if (adapter !== undefined) {
        await deps.saveStorage.upload(gameId, adapter.savePaths());
      }
    }

    if (runtimeId !== undefined) {
      await deps.serverProvider.terminate(runtimeId);
    }

    const completedAt = deps.clock.now();
    state = transition(state, { type: "STOP_COMPLETED", at: completedAt });
    await deps.stateStore.save(state);
    return { ok: true, state };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown stop failure";
    state = await failStop(deps, state, message);
    return { ok: false, code: "STOP_FAILED", message, state };
  }
}

async function failStop(
  deps: AppDeps,
  state: InstallationState,
  errorMessage: string,
): Promise<InstallationState> {
  const at = deps.clock.now();
  const next = transition(state, { type: "STOP_FAILED", errorMessage, at });
  await deps.stateStore.save(next);
  return next;
}
