import type { Logger } from '@walkeros/core';
import type {
  Config,
  Env,
  InitSettings,
  PartialConfig,
  Runtime,
  Settings,
} from './types';
import type { DeliveryTarget } from '../lib/errors';
import {
  DEFAULT_REGION,
  InFlight,
  firstString,
  isHandlerInstance,
  loadSdkRegion,
  parseTopicArn,
} from '../lib/client';
import { parseCredentials } from '../lib/credentials';
import { configError } from '../lib/errors';
import { createSnsClient, createStsClient, getCallerIdentity } from './lib/sns';

/**
 * Resolves the settings once, offline: no credentials are loaded, no topic is
 * created and no AWS call is made. The caller's config is never mutated.
 */
export async function getConfig(
  partialConfig: PartialConfig = {},
  env: Env | undefined,
  logger: Logger.Instance,
  id: string,
): Promise<Config> {
  const input: InitSettings = partialConfig.settings ?? {};
  const { topicArn, config: sdkConfig, client: userClient } = input;

  const arn = topicArn ? parseTopicArn(topicArn) : undefined;
  if (topicArn && !arn)
    throw configError(
      `SNS: settings.topicArn "${topicArn}" is not an SNS topic ARN (arn:aws:sns:<region>:<account>:<name>).`,
    );
  if (!arn && !input.topicName)
    throw configError(
      'SNS: settings.topicArn is missing. Set it to the ARN of your topic (or set settings.topicName).',
    );
  if (arn && input.region && input.region !== arn.region)
    throw configError(
      `SNS: settings.region "${input.region}" differs from the region "${arn.region}" in settings.topicArn. Remove settings.region.`,
    );

  const sdkRegion =
    typeof sdkConfig?.region === 'string' ? sdkConfig.region : undefined;
  const region =
    firstString(input.region, arn?.region, sdkRegion, await loadSdkRegion()) ??
    DEFAULT_REGION;
  const topicName = input.topicName ?? arn?.name;

  if (partialConfig.batch !== undefined)
    logger.warn(
      'SNS publishes one message per event and does not batch. Remove config.batch from this destination.',
    );

  const credentials = parseCredentials(partialConfig.credentials);
  const clientOptions = {
    region,
    config: sdkConfig,
    credentials,
    timeout: partialConfig.timeout,
  };
  const client = userClient ?? createSnsClient(env, clientOptions);

  const runtime: Runtime = {
    ownsClient: !userClient && !isHandlerInstance(sdkConfig?.requestHandler),
    inflight: new InFlight(),
    topicArn: topicArnResolver(
      topicArn,
      topicName,
      {
        service: 'SNS',
        resource: topicName ?? '',
        region,
        id,
      },
      () => createStsClient(env, clientOptions),
      env,
    ),
  };

  const settings: Settings = { region, client, runtime };
  if (topicArn) settings.topicArn = topicArn;
  if (topicName) settings.topicName = topicName;
  if (sdkConfig) settings.config = sdkConfig;

  logger.debug('SNS client ready', {
    topic: topicArn ?? topicName,
    region,
    credentials: userClient
      ? 'client'
      : credentials
        ? 'config.credentials'
        : sdkConfig?.credentials !== undefined
          ? 'settings.config.credentials'
          : 'default chain',
  });

  return { ...partialConfig, settings };
}

/**
 * The topic ARN, as a function a publish awaits. A configured ARN is returned
 * as is. A name alone is completed once with the account id from STS, at the
 * first publish, and cached; a failed lookup is not cached, so the next
 * publish asks again.
 */
function topicArnResolver(
  topicArn: string | undefined,
  topicName: string | undefined,
  target: DeliveryTarget,
  stsClient: () => ReturnType<typeof createStsClient>,
  env: Env | undefined,
): () => Promise<string> {
  if (topicArn) return async () => topicArn;

  const lookup = async (): Promise<string> => {
    const client = stsClient();
    try {
      const { accountId, partition } = await getCallerIdentity(
        client,
        env,
        target,
      );
      return `arn:${partition}:sns:${target.region}:${accountId}:${topicName}`;
    } finally {
      client.destroy?.();
    }
  };

  let pending: Promise<string> | undefined;
  return () => {
    pending ??= lookup().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}

/**
 * Narrows the settings a push receives. Core types them as the slot a user
 * writes, so the fields `init` set are optional there.
 */
export function resolveSettings(settings: InitSettings | undefined): Settings {
  const { region, client, runtime } = settings ?? {};
  if (!region || !client || !runtime)
    throw configError('SNS: the destination was not initialized.');
  return {
    topicArn: settings?.topicArn,
    topicName: settings?.topicName,
    region,
    client,
    runtime,
  };
}
