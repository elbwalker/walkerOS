import type { DestinationServer } from '@walkeros/server-core';
import type { Env, Setup, Types } from './types';
import type { LifecycleContext, Logger } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import { parseCredentials, resolveCredentials } from './config';
import {
  PubSub,
  type PubSub as PubSubClient,
  type Topic,
  type TopicMetadata,
} from '@google-cloud/pubsub';

// Setup is wired to the destination's `setup` slot which uses the broader
// `DestinationServer.Config<Types>` (settings is optional). We runtime-narrow
// instead of using the local Config alias so the assignment in index.ts
// type-checks without contravariance issues.
type WideConfig = DestinationServer.Config<Types>;

const NOT_FOUND_GRPC = 5;
const NOT_FOUND_HTTP = 404;
const ALREADY_EXISTS_GRPC = 6;
const ALREADY_EXISTS_HTTP = 409;

// GCP region names accepted by Pub/Sub's messageStoragePolicy.allowedPersistenceRegions.
// These are the canonical full names (e.g. 'europe-west1'), NOT the colloquial
// abbreviations 'eu-west1' that the API rejects with INVALID_ARGUMENT.
export const DEFAULT_SETUP: Required<Pick<Setup, 'messageStoragePolicy'>> &
  Omit<Setup, 'messageStoragePolicy'> = {
  messageStoragePolicy: {
    allowedPersistenceRegions: ['europe-west1', 'europe-west3', 'europe-west4'],
  },
};

export interface SetupResult {
  topicCreated: boolean;
}

function hasNumericCode(err: unknown): err is { code: number } {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  const obj: { code?: unknown } = err;
  return typeof obj.code === 'number';
}

export function isAlreadyExists(err: unknown): boolean {
  return (
    hasNumericCode(err) &&
    (err.code === ALREADY_EXISTS_GRPC || err.code === ALREADY_EXISTS_HTTP)
  );
}

export function isNotFound(err: unknown): boolean {
  return (
    hasNumericCode(err) &&
    (err.code === NOT_FOUND_GRPC || err.code === NOT_FOUND_HTTP)
  );
}

export async function setup(
  ctx: LifecycleContext<WideConfig, Env>,
): Promise<SetupResult | undefined> {
  const { config, env, logger } = ctx;
  const merged = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!merged) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }

  const settings = config.settings;
  if (!settings) {
    logger.throw('setup: settings missing');
    return;
  }
  const projectId =
    typeof settings.projectId === 'string' ? settings.projectId : '';
  const topicName = typeof settings.topic === 'string' ? settings.topic : '';
  if (!projectId) {
    logger.throw('setup: projectId is missing');
    return;
  }
  if (!topicName) {
    logger.throw('setup: topic is missing');
    return;
  }

  // Resolve the client. Prefer pre-supplied settings.client (init may have
  // populated it); otherwise build from env-injected constructor or the SDK.
  // Track whether setup created the client so we close only what we own.
  let createdClient = false;
  let client: PubSubClient | undefined = settings.client;
  if (!client) {
    const Constructor = env?.PubSub ?? PubSub;
    const credentials = parseCredentials(
      resolveCredentials(config, logger),
      logger,
    );
    const clientOptions = {
      projectId,
      ...(credentials !== undefined && typeof credentials !== 'string'
        ? { credentials }
        : {}),
      ...(settings.apiEndpoint ? { apiEndpoint: settings.apiEndpoint } : {}),
    };
    client = new Constructor(clientOptions);
    createdClient = true;
  }

  const topic = client.topic(topicName);

  let topicCreated = false;
  const [exists] = await topic.exists();
  if (!exists) {
    // Build the TopicMetadata payload. The SDK's `pubsub.createTopic(name |
    // metadata)` is the only path that actually applies messageStoragePolicy
    // and friends at creation time. `topic.create(opts)` accepts only
    // CallOptions and silently drops topic metadata.
    const metadata: TopicMetadata = {
      name: `projects/${projectId}/topics/${topicName}`,
    };
    if (merged.messageStoragePolicy)
      metadata.messageStoragePolicy = merged.messageStoragePolicy;
    if (merged.messageRetentionDuration)
      metadata.messageRetentionDuration = {
        seconds: merged.messageRetentionDuration.seconds,
      };
    if (merged.kmsKeyName) metadata.kmsKeyName = merged.kmsKeyName;
    if (merged.labels) metadata.labels = merged.labels;

    try {
      await client.createTopic(metadata);
      topicCreated = true;
      logger.info('setup: topic created', {
        topic: topicName,
        projectId,
        messageStoragePolicy: metadata.messageStoragePolicy,
      });
    } catch (err) {
      if (isAlreadyExists(err)) {
        logger.debug('setup: topic already exists (race)', {
          topic: topicName,
        });
      } else {
        if (createdClient) {
          await safeClose(client, logger);
        }
        throw err;
      }
    }
  } else {
    logger.debug('setup: topic exists', { topic: topicName });
    await detectDrift(topic, merged, logger);
  }

  if (createdClient) {
    await safeClose(client, logger);
  }

  return { topicCreated };
}

async function safeClose(
  client: { close: () => Promise<void> },
  logger: Logger.Instance,
): Promise<void> {
  try {
    await client.close();
  } catch (err) {
    logger.debug('setup: client.close failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function detectDrift(
  topic: Topic,
  declared: Setup,
  logger: Logger.Instance,
): Promise<void> {
  let metadata: TopicMetadata;
  try {
    const [meta] = await topic.getMetadata();
    metadata = meta ?? {};
  } catch (err) {
    logger.debug('setup: drift check failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // Storage policy drift
  if (declared.messageStoragePolicy) {
    const declaredRegions =
      declared.messageStoragePolicy.allowedPersistenceRegions;
    const actualRegions =
      metadata.messageStoragePolicy?.allowedPersistenceRegions ?? [];
    if (
      declaredRegions.length !== actualRegions.length ||
      declaredRegions.some((r, i) => r !== actualRegions[i])
    ) {
      logger.warn('setup.drift', {
        field: 'messageStoragePolicy.allowedPersistenceRegions',
        declared: declaredRegions,
        actual: actualRegions,
      });
    }
  }

  // Retention drift
  if (declared.messageRetentionDuration) {
    const declaredSeconds = declared.messageRetentionDuration.seconds;
    const actualRaw = metadata.messageRetentionDuration?.seconds;
    const actualSeconds =
      typeof actualRaw === 'number'
        ? actualRaw
        : typeof actualRaw === 'string'
          ? Number(actualRaw)
          : undefined;
    if (actualSeconds !== declaredSeconds) {
      logger.warn('setup.drift', {
        field: 'messageRetentionDuration.seconds',
        declared: declaredSeconds,
        actual: actualSeconds ?? null,
      });
    }
  }

  // KMS key drift
  if (declared.kmsKeyName !== undefined) {
    if (metadata.kmsKeyName !== declared.kmsKeyName) {
      logger.warn('setup.drift', {
        field: 'kmsKeyName',
        declared: declared.kmsKeyName,
        actual: metadata.kmsKeyName ?? null,
      });
    }
  }

  // Labels drift (granular per key)
  if (declared.labels) {
    const actualLabels = metadata.labels ?? {};
    for (const [key, declaredValue] of Object.entries(declared.labels)) {
      const actualValue = actualLabels[key];
      if (actualValue !== declaredValue) {
        logger.warn('setup.drift', {
          field: `labels.${key}`,
          declared: declaredValue,
          actual: actualValue ?? null,
        });
      }
    }
  }
}
