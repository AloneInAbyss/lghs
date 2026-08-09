import { describe, expect, it } from "vitest";

import { InMemoryGameAdapter } from "../fakes/in-memory-game-adapter.js";
import { InMemorySaveStorage } from "../fakes/in-memory-save-storage.js";
import { InMemoryServerProvider } from "../fakes/in-memory-server-provider.js";
import { InMemoryStateStore } from "../fakes/in-memory-state-store.js";
import { createInitialState } from "./installation-state.js";
import { transition } from "./lifecycle.js";

describe("in-memory fakes with lifecycle", () => {
  it("simulates a start → healthy → stop cycle without AWS", async () => {
    const store = new InMemoryStateStore(createInitialState());
    const provider = new InMemoryServerProvider();
    const saves = new InMemorySaveStorage();
    const game = new InMemoryGameAdapter({ id: "minecraft" });

    let state = (await store.get())!;
    state = transition(state, {
      type: "START_REQUESTED",
      gameId: game.id,
      at: "2026-08-08T12:00:00.000Z",
    });
    await store.save(state);

    const plan = game.bootstrapPlan({ restoreSave: true });
    const runtime = await provider.start(plan);
    const sync = {
      runtimeId: runtime.runtimeId,
      workingDirectory: plan.workingDirectory,
    };
    await saves.download(game.id, game.savePaths(), sync);

    const session = await game.connect({
      runtimeId: runtime.runtimeId,
      publicIp: runtime.publicIp!,
    });
    await session.waitUntilHealthy();

    state = transition(state, {
      type: "HEALTH_OK",
      runtimeId: runtime.runtimeId,
      publicIp: runtime.publicIp!,
      connectionPort: game.connectionPort,
      startedAt: "2026-08-08T12:01:00.000Z",
      at: "2026-08-08T12:01:00.000Z",
    });
    await store.save(state);
    expect(state.status).toBe("running");

    state = transition(state, {
      type: "STOP_REQUESTED",
      at: "2026-08-08T12:02:00.000Z",
    });
    await store.save(state);

    await session.flush();
    await session.shutdown();
    await saves.upload(game.id, game.savePaths(), sync);
    await provider.terminate(runtime.runtimeId);

    state = transition(state, {
      type: "STOP_COMPLETED",
      at: "2026-08-08T12:03:00.000Z",
    });
    await store.save(state);

    expect(state.status).toBe("stopped");
    expect(saves.has("minecraft", "world/")).toBe(true);
    expect((await provider.describe(runtime.runtimeId)).status).toBe("terminated");
  });
});
