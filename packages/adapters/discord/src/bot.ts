import type { AppDeps } from "@lghs/core";
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  type ChatInputCommandInteraction,
  type ClientOptions,
  type Interaction,
} from "discord.js";

import { memberHasAdminRole } from "./acl.js";
import { buildSlashCommands } from "./commands.js";
import { handleCommand, type DiscordBotConfig, type SlashCommandName } from "./handle-command.js";

export type DiscordBotOptions = DiscordBotConfig & {
  token: string;
  clientId: string;
  /** When set, registers guild commands (faster for a single community). */
  guildId?: string;
  deps: AppDeps;
  clientOptions?: ClientOptions;
};

/**
 * Discord.js bot: registers slash commands and routes interactions to core use cases.
 * Long start/stop flows use deferred reply + editReply.
 */
export class DiscordBot {
  private readonly client: Client;
  private readonly options: DiscordBotOptions;

  constructor(options: DiscordBotOptions) {
    this.options = options;
    this.client = new Client(
      options.clientOptions ?? {
        intents: [GatewayIntentBits.Guilds],
      },
    );
  }

  async start(): Promise<void> {
    await this.registerCommands();
    this.client.on(Events.InteractionCreate, (interaction) => {
      void this.onInteraction(interaction);
    });
    await this.client.login(this.options.token);
  }

  async stop(): Promise<void> {
    this.client.destroy();
  }

  private async registerCommands(): Promise<void> {
    const rest = new REST({ version: "10" }).setToken(this.options.token);
    const body = buildSlashCommands();
    if (this.options.guildId !== undefined) {
      await rest.put(Routes.applicationGuildCommands(this.options.clientId, this.options.guildId), {
        body,
      });
      return;
    }
    await rest.put(Routes.applicationCommands(this.options.clientId), { body });
  }

  private async onInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }
    await this.handleChatInput(interaction);
  }

  private async handleChatInput(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandName = interaction.commandName;
    if (commandName !== "start" && commandName !== "stop" && commandName !== "status") {
      await interaction.reply({
        content: `Unknown command: ${commandName}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const command = commandName as SlashCommandName;
    const memberRoleIds = extractRoleIds(interaction);

    if (
      (command === "start" || command === "stop") &&
      !memberHasAdminRole(memberRoleIds, this.options.adminRoleId)
    ) {
      await interaction.reply({
        content: "You need the admin role to run this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const gameOption = interaction.options.getString("game") ?? undefined;
    const response = await handleCommand(this.options.deps, this.options, {
      command,
      memberRoleIds,
      ...(gameOption !== undefined ? { gameId: gameOption } : {}),
    });

    await interaction.editReply({ content: response.content });
  }
}

function extractRoleIds(interaction: ChatInputCommandInteraction): string[] {
  const member = interaction.member;
  if (member == null || !("roles" in member)) {
    return [];
  }
  const roles = member.roles;
  if (typeof roles === "object" && roles !== null && "cache" in roles) {
    return [...roles.cache.keys()];
  }
  if (Array.isArray(roles)) {
    return roles.map(String);
  }
  return [];
}
