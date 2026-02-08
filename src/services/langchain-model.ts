import { ChatBedrockConverse } from "@langchain/aws";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import type { Config } from "../config.js";

let model: ChatBedrockConverse | null = null;

export function getModel(config: Config): ChatBedrockConverse {
  if (model) return model;

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

  model = new ChatBedrockConverse({
    model: config.bedrock.modelId,
    region: config.aws.region,
    credentials,
    maxTokens: config.bedrock.maxTokens,
    temperature: 0.9,
  });

  return model;
}
