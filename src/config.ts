import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  aws: z.object({
    region: z.string().default("us-east-1"),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    roleArn: z.string().optional(),
  }),
  bedrock: z.object({
    modelId: z
      .string()
      .default("au.anthropic.claude-sonnet-4-5-20250929-v1:0"),
    maxTokens: z.coerce.number().int().positive().default(4096),
  }),
  ghost: z.object({
    url: z.string().url().default("http://localhost:2368"),
    adminApiKey: z.string().min(1, "GHOST_ADMIN_API_KEY is required"),
    autoPublish: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  }),
  gemini: z.object({
    apiKey: z.string().optional(),
    modelId: z.string().default("gemini-3-pro-image-preview"),
  }),
  scheduler: z.object({
    cronSchedule: z.string().default("0 8 * * 1,3,5"),
    timezone: z.string().default("Australia/Sydney"),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    aws: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      roleArn: process.env.AWS_ROLE_ARN,
    },
    bedrock: {
      modelId: process.env.BEDROCK_MODEL_ID,
      maxTokens: process.env.MAX_TOKENS,
    },
    ghost: {
      url: process.env.GHOST_URL,
      adminApiKey: process.env.GHOST_ADMIN_API_KEY,
      autoPublish: process.env.AUTO_PUBLISH,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
      modelId: process.env.GEMINI_MODEL_ID,
    },
    scheduler: {
      cronSchedule: process.env.CRON_SCHEDULE,
      timezone: process.env.CRON_TIMEZONE,
    },
  });
}
