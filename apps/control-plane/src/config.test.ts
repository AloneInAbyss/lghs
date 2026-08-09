import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

function baseEnv(): NodeJS.ProcessEnv {
  return {
    DISCORD_TOKEN: "token",
    DISCORD_CLIENT_ID: "client",
    DISCORD_ADMIN_ROLE_ID: "admin-role",
    AWS_REGION: "us-east-1",
    LGHS_STATE_TABLE: "lghs-state",
    LGHS_SAVE_BUCKET: "lghs-saves",
    LGHS_EC2_AMI_ID: "ami-123",
    LGHS_EC2_INSTANCE_TYPE: "t3.medium",
    LGHS_EC2_SUBNET_ID: "subnet-123",
    LGHS_EC2_SECURITY_GROUP_IDS: "sg-1, sg-2",
    LGHS_EC2_IAM_INSTANCE_PROFILE: "lghs-game-profile",
    LGHS_MINECRAFT_JAR_URL: "https://example.invalid/server.jar",
    LGHS_MINECRAFT_RCON_PASSWORD: "secret",
  };
}

describe("loadConfig", () => {
  it("loads required values and parses security groups", () => {
    const config = loadConfig(baseEnv());
    expect(config.discordToken).toBe("token");
    expect(config.ec2SecurityGroupIds).toEqual(["sg-1", "sg-2"]);
    expect(config.minecraftRconPort).toBe(25575);
    expect(config.discordGuildId).toBeUndefined();
  });

  it("includes optional guild and key name when set", () => {
    const config = loadConfig({
      ...baseEnv(),
      DISCORD_GUILD_ID: "guild-1",
      LGHS_EC2_KEY_NAME: "lghs",
      LGHS_MINECRAFT_RCON_PORT: "25575",
    });
    expect(config.discordGuildId).toBe("guild-1");
    expect(config.ec2KeyName).toBe("lghs");
  });

  it("fails when a required variable is missing", () => {
    const env = baseEnv();
    delete env.DISCORD_TOKEN;
    expect(() => loadConfig(env)).toThrow(/DISCORD_TOKEN/);
  });
});
