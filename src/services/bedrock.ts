import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import type { Config } from "../config.js";

let client: BedrockRuntimeClient | null = null;

function getClient(config: Config): BedrockRuntimeClient {
  if (client) return client;

  const credentials = config.aws.roleArn
    ? fromTemporaryCredentials({
        params: {
          RoleArn: config.aws.roleArn,
          RoleSessionName: "wooden-dutch",
        },
        masterCredentials:
          config.aws.accessKeyId && config.aws.secretAccessKey
            ? {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey,
              }
            : undefined,
      })
    : config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined;

  client = new BedrockRuntimeClient({
    region: config.aws.region,
    credentials,
  });

  return client;
}

export async function invokeClaude(
  config: Config,
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const bedrock = getClient(config);
  const maxRetries = 3;

  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: options?.maxTokens ?? config.bedrock.maxTokens,
    temperature: options?.temperature ?? 0.9,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: config.bedrock.modelId,
        contentType: "application/json",
        accept: "application/json",
        body,
      });

      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const text = responseBody.content?.[0]?.text;

      if (!text) {
        throw new Error("Empty response from Bedrock");
      }

      return text;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(
        `Bedrock attempt ${attempt} failed, retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Unreachable");
}
