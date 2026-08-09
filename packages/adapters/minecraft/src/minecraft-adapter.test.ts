import { describe, expect, it, vi } from "vitest";

import { MinecraftAdapter } from "./minecraft-adapter.js";
import type { RconLike } from "./rcon-like.js";

describe("MinecraftAdapter", () => {
  it("exposes catalog identity, port, and save paths", () => {
    const adapter = new MinecraftAdapter({
      rconPassword: "secret",
      jarUrl: "https://example.invalid/server.jar",
      saveBucket: "lghs-saves",
    });

    expect(adapter.id).toBe("minecraft");
    expect(adapter.connectionPort).toBe(25565);
    expect(adapter.savePaths()).toEqual([
      "world/",
      "server.properties",
      "ops.json",
      "whitelist.json",
      "banned-players.json",
      "banned-ips.json",
    ]);
  });

  it("builds a bootstrap plan with java install, jar artifact, env, and properties", () => {
    const adapter = new MinecraftAdapter({
      rconPassword: "s3cr3t",
      rconPort: 25575,
      jarUrl: "https://example.invalid/server.jar",
      saveBucket: "lghs-saves",
      workingDirectory: "/opt/minecraft",
    });

    const plan = adapter.bootstrapPlan({ restoreSave: true });

    expect(plan.workingDirectory).toBe("/opt/minecraft");
    expect(plan.restoreSave).toBe(true);
    expect(plan.setupCommands.some((command) => command.includes("java-21"))).toBe(true);
    expect(plan.artifacts).toEqual([
      {
        source: { type: "url", url: "https://example.invalid/server.jar" },
        destinationPath: "server.jar",
      },
    ]);
    expect(plan.env).toEqual({
      LGHS_GAME_ID: "minecraft",
      LGHS_SAVE_BUCKET: "lghs-saves",
    });
    expect(plan.startCommand).toContain("java -Xms1G -Xmx2G -jar server.jar nogui");
    expect(plan.startCommand).toContain("online-mode=false");
    expect(plan.startCommand).toContain("enable-rcon=true");
    expect(plan.startCommand).toContain("rcon.password=s3cr3t");
    expect(plan.startCommand).toContain("rcon.port=25575");
    expect(plan.startCommand).toContain("server-port=25565");
  });

  it("honors restoreSave=false", () => {
    const adapter = new MinecraftAdapter({
      rconPassword: "secret",
      jarUrl: "https://example.invalid/server.jar",
      saveBucket: "lghs-saves",
    });

    expect(adapter.bootstrapPlan({ restoreSave: false }).restoreSave).toBe(false);
  });

  it("connect returns a session backed by the injected RCON factory", async () => {
    const send = vi.fn().mockResolvedValue("There are 0 of a max of 20 players online:");
    const end = vi.fn();
    const createRcon = vi.fn(async () => ({ send, end }) satisfies RconLike);

    const adapter = new MinecraftAdapter({
      rconPassword: "secret",
      jarUrl: "https://example.invalid/server.jar",
      saveBucket: "lghs-saves",
      createRcon,
    });

    const session = await adapter.connect({
      runtimeId: "i-1",
      publicIp: "203.0.113.10",
    });

    await session.waitUntilHealthy(1_000);
    expect(createRcon).toHaveBeenCalledWith("203.0.113.10", 25575, "secret");
    expect(send).toHaveBeenCalledWith("list");
  });
});
