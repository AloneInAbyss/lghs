import { describe, expect, it } from "vitest";

import { createInitialState } from "./installation-state.js";
import { InvalidTransitionError, transition } from "./lifecycle.js";

const AT = "2026-08-08T12:00:00.000Z";
const AT2 = "2026-08-08T12:01:00.000Z";
const AT3 = "2026-08-08T12:02:00.000Z";

describe("lifecycle transition", () => {
  it("stopped → starting on START_REQUESTED", () => {
    const state = createInitialState("INSTALL#default", AT);
    const next = transition(state, {
      type: "START_REQUESTED",
      gameId: "minecraft",
      at: AT2,
    });

    expect(next).toEqual({
      pk: "INSTALL#default",
      status: "starting",
      gameId: "minecraft",
      updatedAt: AT2,
    });
  });

  it("starting → running on HEALTH_OK", () => {
    const starting = transition(createInitialState("INSTALL#default", AT), {
      type: "START_REQUESTED",
      gameId: "minecraft",
      at: AT2,
    });

    const running = transition(starting, {
      type: "HEALTH_OK",
      runtimeId: "i-abc",
      publicIp: "203.0.113.10",
      connectionPort: 25565,
      startedAt: AT3,
      at: AT3,
    });

    expect(running).toEqual({
      pk: "INSTALL#default",
      status: "running",
      gameId: "minecraft",
      runtimeId: "i-abc",
      publicIp: "203.0.113.10",
      connectionPort: 25565,
      startedAt: AT3,
      updatedAt: AT3,
    });
  });

  it("starting → error on START_FAILED", () => {
    const starting = transition(createInitialState(), {
      type: "START_REQUESTED",
      gameId: "minecraft",
      at: AT,
    });

    const errored = transition(starting, {
      type: "START_FAILED",
      errorMessage: "bootstrap failed",
      runtimeId: "i-partial",
      at: AT2,
    });

    expect(errored.status).toBe("error");
    expect(errored.errorMessage).toBe("bootstrap failed");
    expect(errored.runtimeId).toBe("i-partial");
    expect(errored.gameId).toBe("minecraft");
  });

  it("running → stopping → stopped on happy stop path", () => {
    let state = createInitialState();
    state = transition(state, {
      type: "START_REQUESTED",
      gameId: "minecraft",
      at: AT,
    });
    state = transition(state, {
      type: "HEALTH_OK",
      runtimeId: "i-abc",
      publicIp: "203.0.113.10",
      connectionPort: 25565,
      startedAt: AT2,
      at: AT2,
    });
    state = transition(state, { type: "STOP_REQUESTED", at: AT3 });
    expect(state.status).toBe("stopping");
    expect(state.runtimeId).toBe("i-abc");

    state = transition(state, { type: "STOP_COMPLETED", at: "2026-08-08T12:03:00.000Z" });
    expect(state).toEqual({
      pk: "INSTALL#default",
      status: "stopped",
      gameId: "minecraft",
      updatedAt: "2026-08-08T12:03:00.000Z",
    });
  });

  it("stopping → error on STOP_FAILED", () => {
    let state = createInitialState();
    state = transition(state, {
      type: "START_REQUESTED",
      gameId: "minecraft",
      at: AT,
    });
    state = transition(state, {
      type: "HEALTH_OK",
      runtimeId: "i-abc",
      publicIp: "203.0.113.10",
      connectionPort: 25565,
      startedAt: AT2,
      at: AT2,
    });
    state = transition(state, { type: "STOP_REQUESTED", at: AT3 });
    state = transition(state, {
      type: "STOP_FAILED",
      errorMessage: "upload failed",
      at: "2026-08-08T12:03:00.000Z",
    });

    expect(state.status).toBe("error");
    expect(state.errorMessage).toBe("upload failed");
    expect(state.runtimeId).toBe("i-abc");
  });

  it("error without runtime → starting on START_REQUESTED", () => {
    const errored = {
      ...createInitialState(),
      status: "error" as const,
      gameId: "minecraft",
      errorMessage: "previous failure",
      updatedAt: AT,
    };

    const next = transition(errored, {
      type: "START_REQUESTED",
      gameId: "minecraft",
      at: AT2,
    });

    expect(next.status).toBe("starting");
    expect(next.gameId).toBe("minecraft");
    expect(next.errorMessage).toBeUndefined();
  });

  it("error with runtime rejects START_REQUESTED", () => {
    const errored = {
      ...createInitialState(),
      status: "error" as const,
      gameId: "minecraft",
      runtimeId: "i-leftover",
      errorMessage: "partial start",
      updatedAt: AT,
    };

    expect(() =>
      transition(errored, {
        type: "START_REQUESTED",
        gameId: "minecraft",
        at: AT2,
      }),
    ).toThrow(InvalidTransitionError);
  });

  it("error → stopping on STOP_REQUESTED (reconcile)", () => {
    const errored = {
      ...createInitialState(),
      status: "error" as const,
      gameId: "minecraft",
      runtimeId: "i-leftover",
      errorMessage: "partial start",
      updatedAt: AT,
    };

    const next = transition(errored, { type: "STOP_REQUESTED", at: AT2 });
    expect(next.status).toBe("stopping");
    expect(next.runtimeId).toBe("i-leftover");
    expect(next.errorMessage).toBeUndefined();
  });

  it("rejects START_REQUESTED while cycle is active (mutex)", () => {
    for (const status of ["starting", "running", "stopping"] as const) {
      const state = {
        ...createInitialState(),
        status,
        gameId: "minecraft",
        updatedAt: AT,
      };

      expect(() =>
        transition(state, {
          type: "START_REQUESTED",
          gameId: "minecraft",
          at: AT2,
        }),
      ).toThrow(/already active/);
    }
  });

  it("rejects STOP_REQUESTED from stopped", () => {
    expect(() => transition(createInitialState(), { type: "STOP_REQUESTED", at: AT })).toThrow(
      InvalidTransitionError,
    );
  });

  it("rejects HEALTH_OK outside starting", () => {
    expect(() =>
      transition(createInitialState(), {
        type: "HEALTH_OK",
        runtimeId: "i-abc",
        publicIp: "203.0.113.10",
        connectionPort: 25565,
        startedAt: AT,
        at: AT,
      }),
    ).toThrow(InvalidTransitionError);
  });
});
