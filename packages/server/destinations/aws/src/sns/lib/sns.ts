import type { Env, Settings } from '../types';
import { throwError } from '@walkeros/core';

/** Type guard to check if environment has the AWS SNS SDK injected. */
export function isAWSEnvironment(env: unknown): env is Env {
  if (typeof env !== 'object' || env === null) return false;
  if (!('AWS' in env)) return false;
  const aws = (env as { AWS?: unknown }).AWS;
  if (typeof aws !== 'object' || aws === null) return false;
  return 'SNSClient' in aws;
}

/**
 * Resolve `Settings` from a partial input. Validates `topicName`, fills
 * `region` from default, builds an SNSClient from the env-injected
 * constructor when none was supplied.
 */
export function getConfigSNS(
  partial: Partial<Settings>,
  env?: unknown,
): Settings {
  const { topicName, topicArn, config = {} } = partial;
  const region = partial.region ?? 'eu-central-1';

  if (!topicName) throwError('SNS: Settings topicName missing');

  const sdkConfig = config.region ? config : { ...config, region };

  let client = partial.client;
  if (!client && isAWSEnvironment(env)) {
    client = new env.AWS.SNSClient(sdkConfig);
  }

  const resolved: Settings = {
    topicName,
    region,
    config: sdkConfig,
  };
  if (client) resolved.client = client;
  if (topicArn) resolved.topicArn = topicArn;
  return resolved;
}
