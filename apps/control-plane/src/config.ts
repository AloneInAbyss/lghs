export type ControlPlaneConfig = {
  discordToken: string;
  discordClientId: string;
  discordGuildId?: string;
  discordAdminRoleId: string;
  awsRegion: string;
  stateTableName: string;
  saveBucket: string;
  ec2AmiId: string;
  ec2InstanceType: string;
  ec2SubnetId: string;
  ec2SecurityGroupIds: string[];
  ec2IamInstanceProfile: string;
  ec2KeyName?: string;
  minecraftJarUrl: string;
  minecraftRconPassword: string;
  minecraftRconPort: number;
};

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optional(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key];
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}

/** Loads Control Plane configuration from process environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ControlPlaneConfig {
  const guildId = optional(env, "DISCORD_GUILD_ID");
  const keyName = optional(env, "LGHS_EC2_KEY_NAME");
  const rconPortRaw = optional(env, "LGHS_MINECRAFT_RCON_PORT") ?? "25575";
  const rconPort = Number(rconPortRaw);
  if (!Number.isInteger(rconPort) || rconPort <= 0) {
    throw new Error("LGHS_MINECRAFT_RCON_PORT must be a positive integer");
  }

  const config: ControlPlaneConfig = {
    discordToken: required(env, "DISCORD_TOKEN"),
    discordClientId: required(env, "DISCORD_CLIENT_ID"),
    discordAdminRoleId: required(env, "DISCORD_ADMIN_ROLE_ID"),
    awsRegion: required(env, "AWS_REGION"),
    stateTableName: required(env, "LGHS_STATE_TABLE"),
    saveBucket: required(env, "LGHS_SAVE_BUCKET"),
    ec2AmiId: required(env, "LGHS_EC2_AMI_ID"),
    ec2InstanceType: required(env, "LGHS_EC2_INSTANCE_TYPE"),
    ec2SubnetId: required(env, "LGHS_EC2_SUBNET_ID"),
    ec2SecurityGroupIds: required(env, "LGHS_EC2_SECURITY_GROUP_IDS")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
    ec2IamInstanceProfile: required(env, "LGHS_EC2_IAM_INSTANCE_PROFILE"),
    minecraftJarUrl: required(env, "LGHS_MINECRAFT_JAR_URL"),
    minecraftRconPassword: required(env, "LGHS_MINECRAFT_RCON_PASSWORD"),
    minecraftRconPort: rconPort,
  };

  if (config.ec2SecurityGroupIds.length === 0) {
    throw new Error("LGHS_EC2_SECURITY_GROUP_IDS must list at least one security group id");
  }

  if (guildId !== undefined) {
    config.discordGuildId = guildId;
  }
  if (keyName !== undefined) {
    config.ec2KeyName = keyName;
  }

  return config;
}
