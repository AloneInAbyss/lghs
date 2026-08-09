import { describe, expect, it, vi } from "vitest";

import { MinecraftRconSession, parsePlayerCount } from "./minecraft-rcon-session.js";
import type { RconLike } from "./rcon-like.js";

describe("parsePlayerCount", () => {
  it("parses a standard list response", () => {
    expect(parsePlayerCount("There are 3 of a max of 20 players online: a, b, c")).toBe(3);
  });

  it("rejects unrecognized responses", () => {
    expect(() => parsePlayerCount("ok")).toThrow(/Unable to parse player count/);
  });
});

describe("MinecraftRconSession", () => {
  it("waitUntilHealthy retries until list succeeds", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("connection refused"))
      .mockResolvedValue("There are 0 of a max of 20 players online:");
    const end = vi.fn();
    const createRcon = vi.fn(async () => ({ send, end }) satisfies RconLike);

    const session = new MinecraftRconSession({
      host: "203.0.113.10",
      port: 25575,
      password: "secret",
      createRcon,
      pollIntervalMs: 1,
    });

    await session.waitUntilHealthy(5_000);
    expect(createRcon).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith("list");
  });

  it("flush prefers save-all flush and falls back to save-all", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unknown or incomplete command"))
      .mockResolvedValue("Saved the game");
    const end = vi.fn();

    const session = new MinecraftRconSession({
      host: "203.0.113.10",
      port: 25575,
      password: "secret",
      createRcon: async () => ({ send, end }),
    });

    await session.flush();
    expect(send).toHaveBeenNthCalledWith(1, "save-all flush");
    expect(send).toHaveBeenNthCalledWith(2, "save-all");
  });

  it("shutdown sends stop and playerCount parses list", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce("Stopping the server")
      .mockResolvedValueOnce("There are 2 of a max of 20 players online: a, b");
    const end = vi.fn();
    const createRcon = vi.fn(async () => ({ send, end }) satisfies RconLike);

    const session = new MinecraftRconSession({
      host: "203.0.113.10",
      port: 25575,
      password: "secret",
      createRcon,
    });

    await session.shutdown();
    expect(send).toHaveBeenCalledWith("stop");
    expect(end).toHaveBeenCalled();

    // New connection after shutdown reset.
    await expect(session.playerCount()).resolves.toBe(2);
    expect(createRcon).toHaveBeenCalledTimes(2);
  });

  it("waitUntilHealthy times out when RCON never becomes ready", async () => {
    const session = new MinecraftRconSession({
      host: "203.0.113.10",
      port: 25575,
      password: "secret",
      createRcon: async () => {
        throw new Error("still booting");
      },
      pollIntervalMs: 1,
    });

    await expect(session.waitUntilHealthy(20)).rejects.toThrow(/timed out/);
  });
});
