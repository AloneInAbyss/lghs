import { describe, expect, it } from "vitest";

import { getStatus } from "./get-status.js";
import { startServer } from "./start-server.js";
import { stopServer } from "./stop-server.js";
import { createTestDeps } from "./test-helpers.js";

describe("lifecycle use cases", () => {
  it("starts, reports status with connection, then stops and uploads saves", async () => {
    const deps = createTestDeps();

    const started = await startServer(deps, { gameId: "minecraft" });
    expect(started.ok).toBe(true);
    if (!started.ok) {
      return;
    }
    expect(started.state.status).toBe("running");
    expect(started.connection).toEqual({
      gameId: "minecraft",
      ip: "203.0.113.10",
      port: 25565,
    });

    const status = await getStatus(deps);
    expect(status.state.status).toBe("running");
    expect(status.connection).toEqual(started.connection);

    const stopped = await stopServer(deps);
    expect(stopped.ok).toBe(true);
    if (!stopped.ok) {
      return;
    }
    expect(stopped.state.status).toBe("stopped");
    expect(deps.saveStorage.has("minecraft", "world/")).toBe(true);

    const afterStop = await getStatus(deps);
    expect(afterStop.state.status).toBe("stopped");
    expect(afterStop.connection).toBeUndefined();
  });

  it("reuses last selected game when /start omits game id", async () => {
    const deps = createTestDeps();
    const first = await startServer(deps, { gameId: "minecraft" });
    expect(first.ok).toBe(true);
    await stopServer(deps);

    const second = await startServer(deps);
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.connection.gameId).toBe("minecraft");
  });

  it("rejects /start without a game when none was selected before", async () => {
    const deps = createTestDeps();
    const result = await startServer(deps);
    expect(result).toMatchObject({
      ok: false,
      code: "NO_GAME_SELECTED",
    });
  });

  it("rejects unknown game ids", async () => {
    const deps = createTestDeps();
    const result = await startServer(deps, { gameId: "terraria" });
    expect(result).toMatchObject({
      ok: false,
      code: "UNKNOWN_GAME",
    });
  });

  it("rejects /start while a cycle is already active", async () => {
    const deps = createTestDeps();
    await startServer(deps, { gameId: "minecraft" });
    const again = await startServer(deps, { gameId: "minecraft" });
    expect(again).toMatchObject({
      ok: false,
      code: "INVALID_STATE",
    });
  });

  it("moves to error when health check fails", async () => {
    const deps = createTestDeps({ failHealth: true });
    const result = await startServer(deps, { gameId: "minecraft" });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe("START_FAILED");
    expect(result.state.status).toBe("error");
    expect(result.state.runtimeId).toBeDefined();
  });

  it("reconciles /stop from error with leftover runtime", async () => {
    const deps = createTestDeps({ failHealth: true });
    await startServer(deps, { gameId: "minecraft" });

    const stopped = await stopServer(deps);
    expect(stopped.ok).toBe(true);
    if (!stopped.ok) {
      return;
    }
    expect(stopped.state.status).toBe("stopped");
  });

  it("rejects /stop from stopped", async () => {
    const deps = createTestDeps();
    const result = await stopServer(deps);
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_STATE",
    });
  });

  it("allows /start from error when no runtime remains", async () => {
    const deps = createTestDeps();
    deps.serverProvider.failNextStart(new Error("capacity exhausted"));

    const failed = await startServer(deps, { gameId: "minecraft" });
    expect(failed.ok).toBe(false);
    if (failed.ok) {
      return;
    }
    expect(failed.state.status).toBe("error");
    expect(failed.state.runtimeId).toBeUndefined();

    const restarted = await startServer(deps, { gameId: "minecraft" });
    expect(restarted.ok).toBe(true);
  });
});
