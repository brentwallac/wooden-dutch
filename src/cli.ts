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

// --- Reusable action functions ---

async function actionGenerate(opts: { dryRun?: boolean; topicHint?: string }) {
  const config = loadConfig();
  if (!opts.dryRun) {
    await testConnection(config);
  }
  await runPipeline(config, { dryRun: opts.dryRun, topicHint: opts.topicHint });
}

async function actionGenerateBatch(count: number) {
  const config = loadConfig();
  const n = Math.min(count, 20);
  console.log(`Generating ${n} article(s) as drafts...\n`);

  let success = 0;
  for (let i = 0; i < n; i++) {
    try {
      console.log(`--- Article ${i + 1}/${n} ---`);
      await runPipeline(config, { saveOnly: true });
      success++;

      if (i < n - 1) {
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

  console.log(`\nDone: ${success}/${n} articles saved to data/drafts/`);
}

async function actionListDrafts() {
  const drafts = await listDrafts();

  if (drafts.length === 0) {
    console.log("No drafts found in data/drafts/");
    return drafts;
  }

  console.log(`\n${drafts.length} draft(s):\n`);
  for (const [i, { filename, draft }] of drafts.entries()) {
    const date = draft.generatedAt.slice(0, 10);
    const tags = draft.article.tags.slice(0, 3).join(", ");
    console.log(`  ${i + 1}. [${draft.status}] ${draft.article.title}`);
    console.log(`     Date: ${date}  Tags: ${tags}`);
    console.log(`     File: ${filename}\n`);
  }

  return drafts;
}

async function actionPublish(pattern: string) {
  const config = loadConfig();
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
}

async function actionTestGhost() {
  const config = loadConfig();
  await testConnection(config);
  console.log("Ghost connection successful!");
}

// --- Interactive menu ---

async function interactiveMenu() {
  const { intro, select, text, outro, isCancel } = await import(
    "@clack/prompts"
  );

  intro("The Wooden Dutch");

  const action = await select({
    message: "What would you like to do?",
    options: [
      { value: "dry-run", label: "Generate article (dry run)" },
      { value: "publish", label: "Generate article (publish)" },
      { value: "batch", label: "Generate batch of drafts" },
      { value: "list", label: "List saved drafts" },
      { value: "publish-draft", label: "Publish a draft" },
      { value: "test-ghost", label: "Test Ghost connection" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (isCancel(action) || action === "exit") {
    outro("Goodbye!");
    return;
  }

  try {
    switch (action) {
      case "dry-run":
        await actionGenerate({ dryRun: true });
        break;

      case "publish":
        await actionGenerate({ dryRun: false });
        break;

      case "batch": {
        const countInput = await text({
          message: "How many articles?",
          placeholder: "3",
          defaultValue: "3",
          validate: (v) => {
            const n = parseInt(v ?? "", 10);
            if (isNaN(n) || n < 1) return "Enter a number >= 1";
            if (n > 20) return "Max 20 at a time";
          },
        });
        if (isCancel(countInput)) {
          outro("Cancelled.");
          return;
        }
        await actionGenerateBatch(parseInt(countInput, 10));
        break;
      }

      case "list":
        await actionListDrafts();
        break;

      case "publish-draft": {
        const drafts = await listDrafts();
        if (drafts.length === 0) {
          console.log("No drafts found in data/drafts/");
          break;
        }

        const unpublished = drafts.filter((d) => d.draft.status !== "published");
        if (unpublished.length === 0) {
          console.log("All drafts are already published.");
          break;
        }

        const draftChoice = await select({
          message: "Which draft to publish?",
          options: [
            { value: "all", label: "All unpublished drafts" },
            ...unpublished.map(({ filename, draft }) => ({
              value: filename,
              label: draft.article.title,
              hint: filename,
            })),
          ],
        });

        if (isCancel(draftChoice)) {
          outro("Cancelled.");
          return;
        }

        await actionPublish(draftChoice as string);
        break;
      }

      case "test-ghost":
        await actionTestGhost();
        break;
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  outro("Done!");
}

// --- Commander CLI (for scripting/cron) ---

const program = new Command();

program
  .name("wooden-dutch")
  .description("The Wooden Dutch — Satirical Logistics News Generator")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate and publish a single article")
  .option("--dry-run", "Generate article but don't publish to Ghost")
  .option("--topic <hint>", "Guide topic generation toward a specific theme")
  .option("--count <n>", "Generate N articles and save as local drafts", parseInt)
  .action(async (opts: { dryRun?: boolean; topic?: string; count?: number }) => {
    try {
      if (opts.count) {
        await actionGenerateBatch(opts.count);
        return;
      }
      await actionGenerate({ dryRun: opts.dryRun, topicHint: opts.topic });
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
      await actionListDrafts();
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
      const pattern = opts.all ? "all" : file;
      await actionPublish(pattern);
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
      await actionTestGhost();
    } catch (error) {
      console.error(
        "Error:",
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  });

// If no subcommand given, show interactive menu
if (process.argv.length <= 2) {
  interactiveMenu().catch((error) => {
    console.error(
      "Error:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
} else {
  program.parse();
}
