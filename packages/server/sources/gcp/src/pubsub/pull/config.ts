import type { Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { PubSub, type ClientConfig } from '@google-cloud/pubsub';
import type {
  Config,
  Env,
  InitSettings,
  PartialConfig,
  Settings,
} from './types';
import type { ServiceAccountCredentials } from '../shared/types';

/**
 * Runtime config with the narrow Settings shape (all defaults applied).
 * The framework's `Source.Config` types `settings` as `InitSettings | undefined`;
 * this alias reflects the post-getConfig invariant where settings is fully
 * resolved.
 */
export type RuntimeConfig = Omit<Config, 'settings'> & { settings: Settings };

const DEFAULT_DECODER = 'json' as const;
const DEFAULT_FLOW_CONTROL_MAX_MESSAGES = 100;
const DEFAULT_FLOW_CONTROL_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_ACK_DEADLINE_SECONDS = 60;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30000;
const DEFAULT_ON_PUSH_ERROR = 'nack' as const;

/**
 * Validate and normalize the partial config into a runtime Config.
 *
 * Project ID precedence: when both `settings.projectId` and
 * `credentials.project_id` are set, the top-level `settings.projectId` wins.
 * This keeps the runtime subscription target unambiguous.
 *
 * The client is built once: prefer pre-supplied `settings.client`, then env-
 * injected constructor (tests/DI), then the static SDK import. `Settings.client`
 * is always populated before init/destroy run.
 */
export function getConfig(
  partialConfig: PartialConfig = {},
  env: Env | undefined,
  logger: Logger.Instance,
): RuntimeConfig {
  const empty: Partial<InitSettings> = {};
  const settings: Partial<InitSettings> = partialConfig.settings ?? empty;
  const projectId =
    typeof settings.projectId === 'string' ? settings.projectId : '';
  const subscription =
    typeof settings.subscription === 'string' ? settings.subscription : '';

  if (!projectId) logger.throw('Config settings projectId missing');
  if (!subscription) logger.throw('Config settings subscription missing');

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

  const flowControl = settings.flowControl ?? {};
  const resolvedFlowControl = {
    maxMessages: flowControl.maxMessages ?? DEFAULT_FLOW_CONTROL_MAX_MESSAGES,
    maxBytes: flowControl.maxBytes ?? DEFAULT_FLOW_CONTROL_MAX_BYTES,
  };

  const settingsConfig: Settings = {
    ...settings,
    client,
    projectId,
    subscription,
    credentials,
    decoder: settings.decoder ?? DEFAULT_DECODER,
    flowControl: resolvedFlowControl,
    ackDeadline: settings.ackDeadline ?? DEFAULT_ACK_DEADLINE_SECONDS,
    shutdownTimeoutMs:
      settings.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    onPushError: settings.onPushError ?? DEFAULT_ON_PUSH_ERROR,
  };

  return { ...partialConfig, settings: settingsConfig };
}

function parseCredentials(
  raw: InitSettings['credentials'],
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

interface ClientOptionsInput {
  projectId: string;
  credentials?: Settings['credentials'];
  apiEndpoint?: string;
}

function buildClientOptions(input: ClientOptionsInput): ClientConfig {
  const result: ClientConfig = { projectId: input.projectId };
  if (
    input.credentials !== undefined &&
    typeof input.credentials !== 'string'
  ) {
    result.credentials = input.credentials;
  }
  if (input.apiEndpoint) result.apiEndpoint = input.apiEndpoint;
  return result;
}

/**
 * Resolve the constructor options for `new PubSub(...)`.
 *
 * Returns undefined when a pre-built `settings.client` is set; the caller
 * uses that client directly without invoking the SDK constructor.
 */
export function resolveClientConfig(
  settings: Settings,
): ClientConfig | undefined {
  if (settings.client) return undefined;
  return buildClientOptions({
    projectId: settings.projectId,
    credentials: settings.credentials,
    apiEndpoint: settings.apiEndpoint,
  });
}

export function isPubSubEnv(env: unknown): env is Env {
  if (!isObject(env)) return false;
  const candidate: { PubSub?: unknown } = env;
  return (
    candidate.PubSub === undefined || typeof candidate.PubSub === 'function'
  );
}
