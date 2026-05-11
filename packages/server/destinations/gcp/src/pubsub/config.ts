import type {
  Config,
  Env,
  PartialConfig,
  ServiceAccountCredentials,
  Settings,
} from './types';
import type { Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { PubSub } from '@google-cloud/pubsub';

interface ResolvedClientConfig {
  projectId: string;
  credentials?: ServiceAccountCredentials;
  apiEndpoint?: string;
}

interface PartialPubSubSettings {
  client?: Settings['client'];
  projectId?: unknown;
  topic?: unknown;
  credentials?: Settings['credentials'];
  apiEndpoint?: Settings['apiEndpoint'];
  orderingKey?: Settings['orderingKey'];
  attributes?: Settings['attributes'];
}

/**
 * Validate and normalize the partial config into a runtime Config.
 *
 * Project ID precedence: when both `settings.projectId` and
 * `credentials.project_id` are set, the top-level `settings.projectId` wins.
 * This keeps the runtime publish target unambiguous.
 *
 * Mirrors BigQuery's getConfig: the env-injected (or default SDK) client
 * is constructed here so `Settings.client` is always populated before
 * push/destroy run.
 */
export function getConfig(
  partialConfig: PartialConfig = {},
  env: Env | undefined,
  logger: Logger.Instance,
): Config {
  const empty: PartialPubSubSettings = {};
  const settings: PartialPubSubSettings = partialConfig.settings ?? empty;
  const projectId =
    typeof settings.projectId === 'string' ? settings.projectId : '';
  const topic = typeof settings.topic === 'string' ? settings.topic : '';

  if (!projectId) logger.throw('Config settings projectId missing');
  if (!topic) logger.throw('Config settings topic missing');

  const credentials = parseCredentials(settings.credentials, logger);

  // Build the client once: prefer pre-supplied settings.client, then env-
  // injected constructor (tests/DI), then the real SDK.
  let client = settings.client;
  if (!client) {
    const Constructor = env?.PubSub ?? PubSub;
    const clientOptions = buildClientOptions({
      projectId,
      credentials,
      apiEndpoint: settings.apiEndpoint,
    });
    client = new Constructor(clientOptions);
  }

  const settingsConfig: Settings = {
    ...settings,
    client,
    projectId,
    topic,
    credentials,
  };

  return { ...partialConfig, settings: settingsConfig };
}

function parseCredentials(
  raw: Settings['credentials'],
  logger: Logger.Instance,
): Settings['credentials'] {
  if (raw === undefined) return undefined;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isServiceAccountCredentials(parsed)) {
        logger.throw('Invalid credentials JSON');
        return undefined;
      }
      return parsed;
    } catch {
      logger.throw('Invalid credentials JSON');
      return undefined;
    }
  }
  return raw;
}

function isServiceAccountCredentials(
  value: unknown,
): value is ServiceAccountCredentials {
  if (!isObject(value)) return false;
  const candidate: { client_email?: unknown; private_key?: unknown } = value;
  return (
    typeof candidate.client_email === 'string' &&
    typeof candidate.private_key === 'string'
  );
}

/**
 * Resolve the constructor options for `new PubSub(...)`.
 *
 * Returns undefined when a pre-built `settings.client` is set; the caller
 * uses that client directly without invoking the SDK constructor.
 */
export function resolveClientConfig(
  settings: Settings,
): ResolvedClientConfig | undefined {
  if (settings.client) return undefined;
  return buildClientOptions({
    projectId: settings.projectId,
    credentials: settings.credentials,
    apiEndpoint: settings.apiEndpoint,
  });
}

interface ClientOptionsInput {
  projectId: string;
  credentials?: Settings['credentials'];
  apiEndpoint?: string;
}

function buildClientOptions(input: ClientOptionsInput): ResolvedClientConfig {
  const result: ResolvedClientConfig = { projectId: input.projectId };
  if (
    input.credentials !== undefined &&
    typeof input.credentials !== 'string'
  ) {
    result.credentials = input.credentials;
  }
  if (input.apiEndpoint) result.apiEndpoint = input.apiEndpoint;
  return result;
}

export function isPubSubEnv(env: unknown): env is Env {
  if (!isObject(env)) return false;
  const candidate: { PubSub?: unknown } = env;
  return (
    candidate.PubSub === undefined || typeof candidate.PubSub === 'function'
  );
}
