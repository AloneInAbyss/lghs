import { DiscordBot } from "@lghs/adapter-discord";
import { DynamoDbStateStore } from "@lghs/adapter-dynamodb";
import { Ec2ServerProvider } from "@lghs/adapter-ec2";
import { MinecraftAdapter } from "@lghs/adapter-minecraft";
import { S3SaveStorage } from "@lghs/adapter-s3";
import { GameCatalog, systemClock, type AppDeps } from "@lghs/core";

import type { ControlPlaneConfig } from "./config.js";

/** Wires AWS + Discord + Minecraft adapters into core `AppDeps`. */
export function createAppDeps(config: ControlPlaneConfig): AppDeps {
  const minecraft = new MinecraftAdapter({
    jarUrl: config.minecraftJarUrl,
    rconPassword: config.minecraftRconPassword,
    rconPort: config.minecraftRconPort,
    saveBucket: config.saveBucket,
  });

  const ec2Config = {
    amiId: config.ec2AmiId,
    instanceType: config.ec2InstanceType,
    subnetId: config.ec2SubnetId,
    securityGroupIds: config.ec2SecurityGroupIds,
    iamInstanceProfile: config.ec2IamInstanceProfile,
    saveBucket: config.saveBucket,
    ...(config.ec2KeyName !== undefined ? { keyName: config.ec2KeyName } : {}),
  };

  return {
    stateStore: new DynamoDbStateStore({ tableName: config.stateTableName }),
    serverProvider: new Ec2ServerProvider(ec2Config),
    saveStorage: new S3SaveStorage({ bucket: config.saveBucket }),
    games: new GameCatalog([minecraft]),
    clock: systemClock,
  };
}

export function createDiscordBot(config: ControlPlaneConfig, deps: AppDeps): DiscordBot {
  return new DiscordBot({
    token: config.discordToken,
    clientId: config.discordClientId,
    adminRoleId: config.discordAdminRoleId,
    deps,
    ...(config.discordGuildId !== undefined ? { guildId: config.discordGuildId } : {}),
  });
}
