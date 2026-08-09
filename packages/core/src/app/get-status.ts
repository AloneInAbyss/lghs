import { loadOrInitState } from "./load-state.js";
import type { AppDeps, ConnectionInfo, StatusResult } from "./types.js";

/**
 * Reads the current installation lifecycle for `/status`.
 * Available to any Discord user; no preconditions.
 */
export async function getStatus(deps: AppDeps): Promise<StatusResult> {
  const state = await loadOrInitState(deps.stateStore, deps.clock.now());

  let connection: ConnectionInfo | undefined;
  if (
    state.status === "running" &&
    state.gameId !== undefined &&
    state.publicIp !== undefined &&
    state.connectionPort !== undefined
  ) {
    connection = {
      gameId: state.gameId,
      ip: state.publicIp,
      port: state.connectionPort,
    };
  }

  if (connection === undefined) {
    return { state };
  }
  return { state, connection };
}
