import type { BootstrapPlan } from "@lghs/core";
import { describe, expect, it } from "vitest";

import { serializeBootstrapPlanToUserData } from "./user-data.js";

function samplePlan(overrides: Partial<BootstrapPlan> = {}): BootstrapPlan {
  return {
    workingDirectory: "/opt/minecraft",
    setupCommands: ["dnf install -y java-21-amazon-corretto-headless"],
    artifacts: [
      {
        source: { type: "url", url: "https://example.invalid/server.jar" },
        destinationPath: "server.jar",
      },
      {
        source: { type: "s3", bucket: "bins", key: "extra.dat" },
        destinationPath: "data/extra.dat",
      },
    ],
    restoreSave: true,
    startCommand: "java -jar server.jar nogui",
    env: {
      LGHS_GAME_ID: "minecraft",
      LGHS_SAVE_BUCKET: "lghs-saves",
    },
    ...overrides,
  };
}

describe("serializeBootstrapPlanToUserData", () => {
  it("includes startCommand and restore sync for the game id", () => {
    const script = serializeBootstrapPlanToUserData(samplePlan(), {
      saveBucket: "lghs-saves",
    });

    expect(script.startsWith("#!/bin/bash\n")).toBe(true);
    expect(script).toContain("java -jar server.jar nogui");
    expect(script).toContain("aws s3 sync 's3://lghs-saves/saves/minecraft/' \"$WORKDIR/\"");
    expect(script).toContain('nohup "$WORKDIR/.lghs-start.sh"');
    expect(script).toContain("curl -fsSL -o 'server.jar' 'https://example.invalid/server.jar'");
    expect(script).toContain("aws s3 cp 's3://bins/extra.dat' 'data/extra.dat'");
    expect(script).toContain("export LGHS_GAME_ID='minecraft'");
  });

  it("omits restore sync when restoreSave is false", () => {
    const script = serializeBootstrapPlanToUserData(samplePlan({ restoreSave: false }), {
      saveBucket: "lghs-saves",
    });

    expect(script).not.toContain("aws s3 sync");
    expect(script).toContain("java -jar server.jar nogui");
  });

  it("requires LGHS_GAME_ID when restoreSave is true", () => {
    expect(() =>
      serializeBootstrapPlanToUserData(samplePlan({ env: {} }), { saveBucket: "lghs-saves" }),
    ).toThrow(/LGHS_GAME_ID/);
  });
});
