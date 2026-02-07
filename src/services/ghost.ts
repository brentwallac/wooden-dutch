import GhostAdminAPI from "@tryghost/admin-api";
import type { Config } from "../config.js";
import type { GeneratedArticle } from "../types.js";

let api: InstanceType<typeof GhostAdminAPI> | null = null;

function getApi(config: Config): InstanceType<typeof GhostAdminAPI> {
  if (api) return api;

  api = new GhostAdminAPI({
    url: config.ghost.url,
    key: config.ghost.adminApiKey,
    version: "v5.0",
  });

  return api;
}

export async function testConnection(config: Config): Promise<void> {
  const ghost = getApi(config);
  try {
    await ghost.site.read();
    console.log("Ghost connection OK");
  } catch (error) {
    throw new Error(
      `Ghost connection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function publishArticle(
  config: Config,
  article: GeneratedArticle,
): Promise<{ url: string }> {
  const ghost = getApi(config);

  const post = await ghost.posts.add(
    {
      title: article.title,
      html: article.html,
      meta_title: article.metaTitle,
      meta_description: article.metaDescription,
      tags: article.tags.map((name) => ({ name })),
      status: config.ghost.autoPublish ? "published" : "draft",
    },
    { source: "html" },
  );

  return { url: post.url || `${config.ghost.url}/p/${post.uuid}` };
}
