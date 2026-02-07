import { Command } from "commander";
import { loadConfig } from "./config.js";
import { testConnection } from "./services/ghost.js";
import { runPipeline } from "./pipeline/index.js";

const program = new Command();

program
  .name("wooden-dutch")
  .description("The Wooden Dutch — Satirical Logistics News Generator")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate and publish a single article")
  .option("--dry-run", "Generate article but don't publish to Ghost")
  .action(async (opts: { dryRun?: boolean }) => {
    try {
      const config = loadConfig();

      if (!opts.dryRun) {
        await testConnection(config);
      }

      await runPipeline(config, { dryRun: opts.dryRun });
    } catch (error) {
      console.error(
        "Error:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

program
  .command("test-ghost")
  .description("Test Ghost CMS connection")
  .action(async () => {
    try {
      const config = loadConfig();
      await testConnection(config);
      console.log("Ghost connection successful!");
    } catch (error) {
      console.error(
        "Error:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

program.parse();
