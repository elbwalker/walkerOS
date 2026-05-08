import { SQSClient } from '@aws-sdk/client-sqs';
import type { Logger } from '@walkeros/core';
import type {
  Config,
  Env,
  InitSettings,
  PartialConfig,
  Settings,
} from './types';

const DEFAULT_REGION = 'eu-central-1';
const DEFAULT_DECODER = 'json' as const;
const DEFAULT_MAX_MESSAGES = 10;
const DEFAULT_WAIT_TIME = 20;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;
const DEFAULT_ON_PUSH_ERROR = 'nack' as const;

/**
 * Runtime config with the narrow Settings shape (all defaults applied).
 *
 * The framework's `Source.Config` types `settings` as `InitSettings | undefined`;
 * this alias reflects the post-getConfig invariant where settings is fully
 * resolved and the SQSClient handle is built.
 */
export type RuntimeConfig = Omit<Config, 'settings'> & { settings: Settings };

/**
 * Validate and normalize the partial config into a runtime Config.
 *
 * The client is built once: prefer pre-supplied `settings.client`, then env-
 * injected constructor (tests/DI), then the static SDK import. `Settings.client`
 * is always populated before init/destroy run.
 */
export function getConfig(
  partial: PartialConfig = {},
  env: Env | undefined,
  logger: Logger.Instance,
): RuntimeConfig {
  const empty: Partial<InitSettings> = {};
  const partialSettings: Partial<InitSettings> = partial.settings ?? empty;
  const queueName =
    typeof partialSettings.queueName === 'string'
      ? partialSettings.queueName
      : '';
  if (!queueName) logger.throw('Config settings queueName missing');

  const region = partialSettings.region ?? DEFAULT_REGION;

  let client = partialSettings.client;
  if (!client) {
    const Constructor = env?.AWS?.SQSClient ?? SQSClient;
    client = new Constructor({ region, ...partialSettings.config });
  }

  const settings: Settings = {
    ...partialSettings,
    client,
    queueName,
    region,
    queueUrl: partialSettings.queueUrl,
    config: partialSettings.config,
    decoder: partialSettings.decoder ?? DEFAULT_DECODER,
    maxMessages: partialSettings.maxMessages ?? DEFAULT_MAX_MESSAGES,
    waitTimeSeconds: partialSettings.waitTimeSeconds ?? DEFAULT_WAIT_TIME,
    visibilityTimeout: partialSettings.visibilityTimeout,
    shutdownTimeoutMs:
      partialSettings.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    onPushError: partialSettings.onPushError ?? DEFAULT_ON_PUSH_ERROR,
  };

  return { ...partial, settings };
}
