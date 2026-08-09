import { loadConfig } from "./config.js";
import { createAppDeps, createDiscordBot } from "./wiring.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const deps = createAppDeps(config);
  const bot = createDiscordBot(config, deps);

  const shutdown = async (): Promise<void> => {
    await bot.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await bot.start();
  console.log("LGHS control plane started");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
