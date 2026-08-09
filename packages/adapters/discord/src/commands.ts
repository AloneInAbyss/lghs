import {
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

/** Slash command definitions registered with Discord. */
export function buildSlashCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [
    new SlashCommandBuilder()
      .setName("start")
      .setDescription("Start the game server")
      .addStringOption((option) =>
        option
          .setName("game")
          .setDescription("Game id from the catalog (default: last selected)")
          .setRequired(false),
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName("stop")
      .setDescription("Stop the active game server and persist saves")
      .toJSON(),
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Show game server status and connection address")
      .toJSON(),
  ];
}
