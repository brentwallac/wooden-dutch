import { loadConfig } from "./config.js";
import { testConnection } from "./services/ghost.js";
import { startScheduler } from "./services/scheduler.js";
import { runPipeline } from "./pipeline/index.js";

async function main() {
  console.log("The Wooden Dutch — Satirical Logistics News Generator\n");

  const config = loadConfig();
  console.log(`Model: ${config.bedrock.modelId}`);
  console.log(`Ghost: ${config.ghost.url}`);
  console.log(`Auto-publish: ${config.ghost.autoPublish}`);

  await testConnection(config);

  startScheduler(config, async () => {
    await runPipeline(config);
  });

  console.log("\nScheduler running. Press Ctrl+C to stop.\n");
}

main().catch((error) => {
  console.error("Fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
