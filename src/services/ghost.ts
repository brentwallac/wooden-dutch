import { createHmac } from "node:crypto";
import type { Config } from "../config.js";
import type { GeneratedArticle } from "../types.js";

function makeGhostToken(adminApiKey: string): string {
  const [id, secret] = adminApiKey.split(":");
  if (!secret) throw new Error("Invalid admin API key format — expected 'id:secret'");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" })).toString("base64url");
  const sig = createHmac("sha256", Buffer.from(secret, "hex")).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export async function testConnection(config: Config): Promise<void> {
  const token = makeGhostToken(config.ghost.adminApiKey);
  const res = await fetch(`${config.ghost.url}/ghost/api/admin/site/`, {
    headers: {
      Authorization: `Ghost ${token}`,
      "Accept-Version": "v5.0",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ghost connection failed (${res.status}): ${body}`);
  }

  console.log("Ghost connection OK");
}

export async function uploadImage(
  config: Config,
  imageBuffer: Buffer,
  filename: string,
): Promise<{ url: string }> {
  const token = makeGhostToken(config.ghost.adminApiKey);
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });
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
  const token = makeGhostToken(config.ghost.adminApiKey);

  const postData = {
    title: article.title,
    html: article.html,
    meta_title: article.metaTitle,
    meta_description: article.metaDescription,
    tags: article.tags.map((name: string) => ({ name })),
    status: config.ghost.autoPublish ? "published" : "draft",
    ...(article.authorSlug && {
      authors: [{ slug: article.authorSlug }],
    }),
    ...(article.featureImageUrl && {
      feature_image: article.featureImageUrl,
      feature_image_alt: article.title,
    }),
  };

  const res = await fetch(
    `${config.ghost.url}/ghost/api/admin/posts/?source=html`,
    {
      method: "POST",
      headers: {
        Authorization: `Ghost ${token}`,
        "Content-Type": "application/json",
        "Accept-Version": "v5.0",
      },
      body: JSON.stringify({ posts: [postData] }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ghost publish failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const post = data.posts?.[0];
  if (!post) throw new Error("Ghost publish returned no post data");

  return { url: post.url || `${config.ghost.url}/p/${post.uuid}` };
}
