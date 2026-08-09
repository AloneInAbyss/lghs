import type { InstallationState } from "./installation-state.js";

/** Events that drive the Game Server lifecycle state machine. */
export type LifecycleEvent =
  | { type: "START_REQUESTED"; gameId: string; at: string }
  | {
      type: "HEALTH_OK";
      runtimeId: string;
      publicIp: string;
      connectionPort: number;
      startedAt: string;
      at: string;
    }
  | { type: "START_FAILED"; errorMessage: string; runtimeId?: string; at: string }
  | { type: "STOP_REQUESTED"; at: string }
  | { type: "STOP_COMPLETED"; at: string }
  | { type: "STOP_FAILED"; errorMessage: string; at: string };

export class InvalidTransitionError extends Error {
  readonly currentStatus: InstallationState["status"];
  readonly eventType: LifecycleEvent["type"];

  constructor(state: InstallationState, event: LifecycleEvent, reason?: string) {
    const detail = reason ? `: ${reason}` : "";
    super(`Invalid transition ${state.status} + ${event.type}${detail}`);
    this.name = "InvalidTransitionError";
    this.currentStatus = state.status;
    this.eventType = event.type;
  }
}

/**
 * Pure transition of the Game Server lifecycle.
 *
 * Mutex: at most one active cycle (`starting` | `running` | `stopping`).
 * From `error`, `/start` is allowed only when there is no runtime to reconcile;
 * `/stop` is always allowed to reconcile a failed cycle.
 */
export function transition(state: InstallationState, event: LifecycleEvent): InstallationState {
  switch (event.type) {
    case "START_REQUESTED":
      return applyStartRequested(state, event);
    case "HEALTH_OK":
      return applyHealthOk(state, event);
    case "START_FAILED":
      return applyStartFailed(state, event);
    case "STOP_REQUESTED":
      return applyStopRequested(state, event);
    case "STOP_COMPLETED":
      return applyStopCompleted(state, event);
    case "STOP_FAILED":
      return applyStopFailed(state, event);
  }
}

function applyStartRequested(
  state: InstallationState,
  event: Extract<LifecycleEvent, { type: "START_REQUESTED" }>,
): InstallationState {
  if (state.status === "stopped") {
    return {
      pk: state.pk,
      status: "starting",
      gameId: event.gameId,
      updatedAt: event.at,
    };
  }

  if (state.status === "error" && state.runtimeId === undefined) {
    return {
      pk: state.pk,
      status: "starting",
      gameId: event.gameId,
      updatedAt: event.at,
    };
  }

  if (state.status === "error" && state.runtimeId !== undefined) {
    throw new InvalidTransitionError(
      state,
      event,
      "runtime still present; use /stop to reconcile first",
    );
  }

  throw new InvalidTransitionError(state, event, "server cycle already active");
}

function applyHealthOk(
  state: InstallationState,
  event: Extract<LifecycleEvent, { type: "HEALTH_OK" }>,
): InstallationState {
  if (state.status !== "starting") {
    throw new InvalidTransitionError(state, event);
  }

  const next: InstallationState = {
    pk: state.pk,
    status: "running",
    runtimeId: event.runtimeId,
    publicIp: event.publicIp,
    connectionPort: event.connectionPort,
    startedAt: event.startedAt,
    updatedAt: event.at,
  };

  if (state.gameId !== undefined) {
    next.gameId = state.gameId;
  }

  return next;
}

function applyStartFailed(
  state: InstallationState,
  event: Extract<LifecycleEvent, { type: "START_FAILED" }>,
): InstallationState {
  if (state.status !== "starting") {
    throw new InvalidTransitionError(state, event);
  }

  const next: InstallationState = {
    pk: state.pk,
    status: "error",
    errorMessage: event.errorMessage,
    updatedAt: event.at,
  };

  if (state.gameId !== undefined) {
    next.gameId = state.gameId;
  }

  if (event.runtimeId !== undefined) {
    next.runtimeId = event.runtimeId;
  }

  return next;
}

function applyStopRequested(
  state: InstallationState,
  event: Extract<LifecycleEvent, { type: "STOP_REQUESTED" }>,
): InstallationState {
  if (state.status !== "running" && state.status !== "error") {
    throw new InvalidTransitionError(state, event);
  }

  const next: InstallationState = {
    pk: state.pk,
    status: "stopping",
    updatedAt: event.at,
  };

  if (state.gameId !== undefined) {
    next.gameId = state.gameId;
  }
  if (state.runtimeId !== undefined) {
    next.runtimeId = state.runtimeId;
  }
  if (state.publicIp !== undefined) {
    next.publicIp = state.publicIp;
  }
  if (state.connectionPort !== undefined) {
    next.connectionPort = state.connectionPort;
  }
  if (state.startedAt !== undefined) {
    next.startedAt = state.startedAt;
  }

  return next;
}

function applyStopCompleted(
  state: InstallationState,
  event: Extract<LifecycleEvent, { type: "STOP_COMPLETED" }>,
): InstallationState {
  if (state.status !== "stopping") {
    throw new InvalidTransitionError(state, event);
  }

  const next: InstallationState = {
    pk: state.pk,
    status: "stopped",
    updatedAt: event.at,
  };

  if (state.gameId !== undefined) {
    next.gameId = state.gameId;
  }

  return next;
}

function applyStopFailed(
  state: InstallationState,
  event: Extract<LifecycleEvent, { type: "STOP_FAILED" }>,
): InstallationState {
  if (state.status !== "stopping") {
    throw new InvalidTransitionError(state, event);
  }

  const next: InstallationState = {
    pk: state.pk,
    status: "error",
    errorMessage: event.errorMessage,
    updatedAt: event.at,
  };

  if (state.gameId !== undefined) {
    next.gameId = state.gameId;
  }
  if (state.runtimeId !== undefined) {
    next.runtimeId = state.runtimeId;
  }
  if (state.publicIp !== undefined) {
    next.publicIp = state.publicIp;
  }
  if (state.connectionPort !== undefined) {
    next.connectionPort = state.connectionPort;
  }
  if (state.startedAt !== undefined) {
    next.startedAt = state.startedAt;
  }

  return next;
}
