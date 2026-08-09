import type { BootstrapPlan, GameAdapter, GameSession, RuntimeHandle } from "@lghs/core";
import { Rcon } from "rcon-client";

import { MinecraftRconSession } from "./minecraft-rcon-session.js";
import type { CreateRcon } from "./rcon-like.js";

const DEFAULT_WORKING_DIRECTORY = "/opt/minecraft";
const DEFAULT_CONNECTION_PORT = 25565;
const DEFAULT_RCON_PORT = 25575;
const SERVER_JAR_NAME = "server.jar";

const SAVE_PATHS = [
  "world/",
  "server.properties",
  "ops.json",
  "whitelist.json",
  "banned-players.json",
  "banned-ips.json",
] as const;

export interface MinecraftAdapterConfig {
  rconPassword: string;
  rconPort?: number;
  /** Explicit jar URL for MVP — adapters do not fetch "latest" themselves. */
  jarUrl: string;
  saveBucket: string;
  workingDirectory?: string;
  connectionPort?: number;
  /** Inject a fake RCON factory in unit tests. */
  createRcon?: CreateRcon;
}

function buildServerProperties(password: string, rconPort: number, gamePort: number): string {
  return [
    "online-mode=false",
    "enable-rcon=true",
    `rcon.password=${password}`,
    `rcon.port=${rconPort}`,
    `server-port=${gamePort}`,
  ].join("\n");
}

async function defaultCreateRcon(host: string, port: number, password: string): Promise<Rcon> {
  return Rcon.connect({ host, port, password });
}

export class MinecraftAdapter implements GameAdapter {
  readonly id = "minecraft";
  readonly connectionPort: number;

  private readonly rconPassword: string;
  private readonly rconPort: number;
  private readonly jarUrl: string;
  private readonly saveBucket: string;
  private readonly workingDirectory: string;
  private readonly createRcon: CreateRcon;

  constructor(config: MinecraftAdapterConfig) {
    this.rconPassword = config.rconPassword;
    this.rconPort = config.rconPort ?? DEFAULT_RCON_PORT;
    this.jarUrl = config.jarUrl;
    this.saveBucket = config.saveBucket;
    this.workingDirectory = config.workingDirectory ?? DEFAULT_WORKING_DIRECTORY;
    this.connectionPort = config.connectionPort ?? DEFAULT_CONNECTION_PORT;
    this.createRcon = config.createRcon ?? defaultCreateRcon;
  }

  savePaths(): readonly string[] {
    return SAVE_PATHS;
  }

  bootstrapPlan(options?: { restoreSave?: boolean }): BootstrapPlan {
    const properties = buildServerProperties(this.rconPassword, this.rconPort, this.connectionPort);

    // Rewrite properties in startCommand so configured RCON settings win after an optional save restore.
    const startCommand = [
      "cat > server.properties <<'LGHS_PROPERTIES_EOF'",
      properties,
      "LGHS_PROPERTIES_EOF",
      "test -f eula.txt || echo eula=true > eula.txt",
      `java -Xms1G -Xmx2G -jar ${SERVER_JAR_NAME} nogui`,
    ].join("\n");

    return {
      workingDirectory: this.workingDirectory,
      setupCommands: [
        "dnf install -y java-21-amazon-corretto-headless",
        "echo eula=true > eula.txt",
        ["cat > server.properties <<'LGHS_PROPERTIES_EOF'", properties, "LGHS_PROPERTIES_EOF"].join(
          "\n",
        ),
      ],
      artifacts: [
        {
          source: { type: "url", url: this.jarUrl },
          destinationPath: SERVER_JAR_NAME,
        },
      ],
      restoreSave: options?.restoreSave ?? true,
      startCommand,
      env: {
        LGHS_GAME_ID: this.id,
        LGHS_SAVE_BUCKET: this.saveBucket,
      },
    };
  }

  async connect(runtime: RuntimeHandle): Promise<GameSession> {
    return new MinecraftRconSession({
      host: runtime.publicIp,
      port: this.rconPort,
      password: this.rconPassword,
      createRcon: this.createRcon,
    });
  }
}
