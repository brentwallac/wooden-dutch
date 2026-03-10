import { loadConfig } from "./config.js";
import { testConnection } from "./services/ghost.js";
import { startScheduler } from "./services/scheduler.js";
import { runPipeline } from "./pipeline/index.js";

async function main() {
  console.log("The Wooden Dutch — Satirical Logistics News Generator\n");

  const config = loadConfig();
  console.log(`Model: ${config.anthropic.modelId}`);
  console.log(`Ghost: ${config.ghost.url}`);
  console.log(`Auto-publish: ${config.ghost.autoPublish}`);

  await testConnection(config);

  startScheduler(config, config.scheduler.cronSchedule, "Article", async () => {
    await runPipeline(config);
  });

  startScheduler(config, config.scheduler.cartoonCronSchedule, "Cartoon", async () => {
    await runPipeline(config, { cartoon: true });
  });

  console.log("\nSchedulers running. Press Ctrl+C to stop.\n");
}

main().catch((error) => {
  console.error("Fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
