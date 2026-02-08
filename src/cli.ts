import { Command } from "commander";
import { loadConfig } from "./config.js";
import { testConnection, publishArticle } from "./services/ghost.js";
import { runPipeline } from "./pipeline/index.js";
import {
  listDrafts,
  findDraftFiles,
  loadCompanionImage,
  markDraftPublished,
} from "./services/draft-manager.js";
import { uploadImage } from "./services/ghost.js";

const program = new Command();

program
  .name("wooden-dutch")
  .description("The Wooden Dutch — Satirical Logistics News Generator")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate and publish a single article")
  .option("--dry-run", "Generate article but don't publish to Ghost")
  .option("--count <n>", "Generate N articles and save as local drafts", parseInt)
  .action(async (opts: { dryRun?: boolean; count?: number }) => {
    try {
      const config = loadConfig();

      if (opts.count) {
        const count = Math.min(opts.count, 20);
        console.log(`Generating ${count} article(s) as drafts...\n`);

        let success = 0;
        for (let i = 0; i < count; i++) {
          try {
            console.log(`--- Article ${i + 1}/${count} ---`);
            await runPipeline(config, { saveOnly: true });
            success++;

            if (i < count - 1) {
              console.log("Waiting 5 seconds...\n");
              await new Promise((r) => setTimeout(r, 5000));
            }
          } catch (error) {
            console.error(
              `Failed article ${i + 1}:`,
              error instanceof Error ? error.message : error,
            );
          }
        }

        console.log(`\nDone: ${success}/${count} articles saved to data/drafts/`);
        return;
      }

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
  .command("list")
  .description("List saved draft articles")
  .action(async () => {
    try {
      const drafts = await listDrafts();

      if (drafts.length === 0) {
        console.log("No drafts found in data/drafts/");
        return;
      }

      console.log(`\n${drafts.length} draft(s):\n`);
      for (const [i, { filename, draft }] of drafts.entries()) {
        const date = draft.generatedAt.slice(0, 10);
        const tags = draft.article.tags.slice(0, 3).join(", ");
        console.log(`  ${i + 1}. [${draft.status}] ${draft.article.title}`);
        console.log(`     Date: ${date}  Tags: ${tags}`);
        console.log(`     File: ${filename}\n`);
      }
    } catch (error) {
      console.error(
        "Error:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

program
  .command("publish <file>")
  .description("Publish draft(s) to Ghost (filename, ID prefix, or 'all')")
  .option("--all", "Publish all drafts")
  .action(async (file: string, opts: { all?: boolean }) => {
    try {
      const config = loadConfig();
      const pattern = opts.all ? "all" : file;
      const matches = await findDraftFiles(pattern);

      if (matches.length === 0) {
        console.log("No matching drafts found.");
        return;
      }

      console.log("Testing Ghost connection...");
      await testConnection(config);

      let published = 0;
      let skipped = 0;

      for (const { filename, draft } of matches) {
        if (draft.status === "published") {
          console.log(`Skipping (already published): ${filename}`);
          skipped++;
          continue;
        }

        console.log(`Publishing: ${draft.article.title}...`);

        // Upload companion image if one exists
        const imageBuffer = await loadCompanionImage(filename);
        if (imageBuffer) {
          const { url: imageUrl } = await uploadImage(
            config,
            imageBuffer,
            "feature-image.jpg",
          );
          draft.article.featureImageUrl = imageUrl;
        }

        const { url } = await publishArticle(config, draft.article);
        await markDraftPublished(filename, url);
        console.log(`  Published: ${url}`);
        published++;
      }

      console.log(`\nDone: ${published} published, ${skipped} skipped`);
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
