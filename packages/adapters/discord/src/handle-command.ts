import { memberHasAdminRole } from "./acl.js";
import type {
  AppDeps,
  ConnectionInfo,
  InstallationState,
  StartResult,
  StatusResult,
  StopResult,
} from "@lghs/core";
import { getStatus, startServer, stopServer } from "@lghs/core";

export type SlashCommandName = "start" | "stop" | "status";

export type CommandRequest = {
  command: SlashCommandName;
  gameId?: string;
  /** Caller role IDs from the Discord guild member. */
  memberRoleIds: readonly string[];
};

export type CommandResponse = {
  ephemeral: boolean;
  content: string;
};

export type DiscordBotConfig = {
  adminRoleId: string;
};

/**
 * Handles slash-command intent after Discord already deferred the interaction.
 * Pure relative to discord.js so ACL and messaging stay unit-testable.
 */
export async function handleCommand(
  deps: AppDeps,
  config: DiscordBotConfig,
  request: CommandRequest,
): Promise<CommandResponse> {
  switch (request.command) {
    case "status":
      return formatStatus(await getStatus(deps));
    case "start":
    case "stop":
      break;
    default: {
      const _exhaustive: never = request.command;
      return { ephemeral: true, content: `Unknown command: ${_exhaustive}` };
    }
  }

  if (!memberHasAdminRole(request.memberRoleIds, config.adminRoleId)) {
    return {
      ephemeral: true,
      content: "You need the admin role to run this command.",
    };
  }

  if (request.command === "start") {
    const input = request.gameId === undefined ? {} : { gameId: request.gameId };
    return formatStart(await startServer(deps, input));
  }

  return formatStop(await stopServer(deps));
}

function formatStatus(result: StatusResult): CommandResponse {
  const { state, connection } = result;
  const lines = [
    `**Status:** \`${state.status}\``,
    state.gameId !== undefined ? `**Game:** \`${state.gameId}\`` : undefined,
    connection !== undefined ? `**Connect:** \`${connection.ip}:${connection.port}\`` : undefined,
    state.startedAt !== undefined ? `**Started:** ${state.startedAt}` : undefined,
    state.errorMessage !== undefined ? `**Error:** ${state.errorMessage}` : undefined,
  ].filter((line): line is string => line !== undefined);

  return { ephemeral: false, content: lines.join("\n") };
}

function formatStart(result: StartResult): CommandResponse {
  if (result.ok) {
    return {
      ephemeral: false,
      content: formatRunning(result.state, result.connection),
    };
  }
  return {
    ephemeral: true,
    content: `Start failed (${result.code}): ${result.message}`,
  };
}

function formatStop(result: StopResult): CommandResponse {
  if (result.ok) {
    return {
      ephemeral: false,
      content: `Server stopped. Status: \`${result.state.status}\`.`,
    };
  }
  return {
    ephemeral: true,
    content: `Stop failed (${result.code}): ${result.message}`,
  };
}

function formatRunning(state: InstallationState, connection: ConnectionInfo): string {
  return [
    `Server is **running** (\`${connection.gameId}\`).`,
    `Connect: \`${connection.ip}:${connection.port}\``,
    state.startedAt !== undefined ? `Started: ${state.startedAt}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}
