import { InvalidTransitionError, transition } from "../domain/lifecycle.js";
import type { InstallationState } from "../domain/installation-state.js";
import { loadOrInitState } from "./load-state.js";
import type { AppDeps, StartResult } from "./types.js";

export type StartServerInput = {
  /** When omitted, reuses `state.gameId` (last selected game). */
  gameId?: string;
};

/**
 * Orchestrates `/start`: mutex/preconditions, provision, health, then `running`.
 * Permission checks belong to the Discord adapter, not here.
 *
 * Save restore runs inside provider bootstrap when `bootstrapPlan.restoreSave` is true
 * (EC2 user-data), not as a separate Control Plane download step.
 */
export async function startServer(
  deps: AppDeps,
  input: StartServerInput = {},
): Promise<StartResult> {
  const at = deps.clock.now();
  let state = await loadOrInitState(deps.stateStore, at);

  const gameId = input.gameId ?? state.gameId;
  if (gameId === undefined) {
    return {
      ok: false,
      code: "NO_GAME_SELECTED",
      message: "No game selected; pass a game id or start one explicitly first",
      state,
    };
  }

  const adapter = deps.games.get(gameId);
  if (adapter === undefined) {
    return {
      ok: false,
      code: "UNKNOWN_GAME",
      message: `Unknown game: ${gameId}`,
      state,
    };
  }

  try {
    state = transition(state, { type: "START_REQUESTED", gameId, at });
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

  let runtimeId: string | undefined;
  try {
    const plan = adapter.bootstrapPlan({ restoreSave: true });
    const runtime = await deps.serverProvider.start(plan);
    runtimeId = runtime.runtimeId;

    if (runtime.publicIp === undefined) {
      state = await failStart(deps, state, "Runtime started without a public IP", runtimeId);
      return {
        ok: false,
        code: "MISSING_PUBLIC_IP",
        message: "Runtime started without a public IP",
        state,
      };
    }

    const session = await adapter.connect({
      runtimeId: runtime.runtimeId,
      publicIp: runtime.publicIp,
    });
    await session.waitUntilHealthy();

    const startedAt = deps.clock.now();
    state = transition(state, {
      type: "HEALTH_OK",
      runtimeId: runtime.runtimeId,
      publicIp: runtime.publicIp,
      connectionPort: adapter.connectionPort,
      startedAt,
      at: startedAt,
    });
    await deps.stateStore.save(state);

    return {
      ok: true,
      state,
      connection: {
        gameId,
        ip: runtime.publicIp,
        port: adapter.connectionPort,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown start failure";
    state = await failStart(deps, state, message, runtimeId);
    return { ok: false, code: "START_FAILED", message, state };
  }
}

async function failStart(
  deps: AppDeps,
  state: InstallationState,
  errorMessage: string,
  runtimeId: string | undefined,
): Promise<InstallationState> {
  const at = deps.clock.now();
  const event =
    runtimeId === undefined
      ? { type: "START_FAILED" as const, errorMessage, at }
      : { type: "START_FAILED" as const, errorMessage, runtimeId, at };
  const next = transition(state, event);
  await deps.stateStore.save(next);
  return next;
}
