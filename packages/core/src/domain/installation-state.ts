/** Lifecycle status of the Game Server as seen by `/status` and command preconditions. */
export type GameServerStatus = "stopped" | "starting" | "running" | "stopping" | "error";

/** Primary lifecycle record persisted in `StateStore` (one per LGHS installation). */
export interface InstallationState {
  pk: string;
  status: GameServerStatus;
  gameId?: string;
  runtimeId?: string;
  publicIp?: string;
  connectionPort?: number;
  /** ISO-8601 timestamp when the session entered `running`, if applicable. */
  startedAt?: string;
  errorMessage?: string;
  /** ISO-8601 timestamp of the last transition. */
  updatedAt: string;
}

export const DEFAULT_INSTALLATION_PK = "INSTALL#default";

export function createInitialState(
  pk: string = DEFAULT_INSTALLATION_PK,
  now: string = new Date().toISOString(),
): InstallationState {
  return {
    pk,
    status: "stopped",
    updatedAt: now,
  };
}
