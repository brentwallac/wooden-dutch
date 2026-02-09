import { createHmac } from "node:crypto";
import GhostAdminAPI from "@tryghost/admin-api";
import type { Config } from "../config.js";
import type { GeneratedArticle } from "../types.js";

function getApi(config: Config): InstanceType<typeof GhostAdminAPI> {
  return new GhostAdminAPI({
    url: config.ghost.url,
    key: config.ghost.adminApiKey,
    version: "v5.0",
  });
}

function makeGhostToken(adminApiKey: string): string {
  const [id, secret] = adminApiKey.split(":");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })).toString("base64url");
  const sig = createHmac("sha256", Buffer.from(secret, "hex")).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
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

export async function uploadImage(
  config: Config,
  imageBuffer: Buffer,
  filename: string,
): Promise<{ url: string }> {
  const token = makeGhostToken(config.ghost.adminApiKey);
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: "image/jpeg" });
  formData.append("file", blob, `${Date.now()}-${filename}`);

  const res = await fetch(`${config.ghost.url}/ghost/api/admin/images/upload/`, {
    method: "POST",
    headers: { Authorization: `Ghost ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ghost image upload failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("Ghost image upload returned no URL");

  console.log(`Image uploaded to Ghost: ${url}`);
  return { url };
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
      ...(article.authorSlug && {
        authors: [{ slug: article.authorSlug }],
      }),
      ...(article.featureImageUrl && {
        feature_image: article.featureImageUrl,
        feature_image_alt: article.title,
      }),
    },
    { source: "html" },
  );

  return { url: post.url || `${config.ghost.url}/p/${post.uuid}` };
}
