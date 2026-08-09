import { describe, expect, it } from "vitest";

import {
  GameCatalog,
  InMemoryGameAdapter,
  InMemorySaveStorage,
  InMemoryServerProvider,
  InMemoryStateStore,
  systemClock,
  type AppDeps,
} from "@lghs/core";

import { memberHasAdminRole } from "./acl.js";
import { buildSlashCommands } from "./commands.js";
import { handleCommand } from "./handle-command.js";

const ADMIN = "role-admin";

function createDeps(): AppDeps {
  return {
    stateStore: new InMemoryStateStore(),
    serverProvider: new InMemoryServerProvider(),
    saveStorage: new InMemorySaveStorage(),
    games: new GameCatalog([new InMemoryGameAdapter({ id: "minecraft" })]),
    clock: systemClock,
  };
}

describe("memberHasAdminRole", () => {
  it("accepts admins and rejects others", () => {
    expect(memberHasAdminRole([ADMIN, "other"], ADMIN)).toBe(true);
    expect(memberHasAdminRole(["other"], ADMIN)).toBe(false);
    expect(memberHasAdminRole(new Set([ADMIN]), ADMIN)).toBe(true);
  });
});

describe("buildSlashCommands", () => {
  it("registers start, stop, and status", () => {
    const names = buildSlashCommands().map((command) => command.name);
    expect(names).toEqual(["start", "stop", "status"]);
  });
});

describe("handleCommand", () => {
  it("allows /status for any member", async () => {
    const response = await handleCommand(
      createDeps(),
      { adminRoleId: ADMIN },
      {
        command: "status",
        memberRoleIds: [],
      },
    );
    expect(response.content).toContain("stopped");
  });

  it("rejects /start without admin role", async () => {
    const response = await handleCommand(
      createDeps(),
      { adminRoleId: ADMIN },
      {
        command: "start",
        gameId: "minecraft",
        memberRoleIds: ["nobody"],
      },
    );
    expect(response.content).toMatch(/admin role/i);
  });

  it("starts and stops through core use cases when admin", async () => {
    const deps = createDeps();
    const config = { adminRoleId: ADMIN };

    const started = await handleCommand(deps, config, {
      command: "start",
      gameId: "minecraft",
      memberRoleIds: [ADMIN],
    });
    expect(started.content).toMatch(/running/i);
    expect(started.content).toMatch(/203\.0\.113\.10:25565/);

    const status = await handleCommand(deps, config, {
      command: "status",
      memberRoleIds: [],
    });
    expect(status.content).toMatch(/running/i);

    const stopped = await handleCommand(deps, config, {
      command: "stop",
      memberRoleIds: [ADMIN],
    });
    expect(stopped.content).toMatch(/stopped/i);
  });
});
