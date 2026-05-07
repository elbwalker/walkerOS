import type { Logger } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type {
  CreateSubscriptionOptions,
  PubSub,
  TopicMetadata,
  protos,
} from '@google-cloud/pubsub';
import type { Config, Setup, SetupFn } from './types';

/**
 * Server-side subscription proto returned by `subscription.getMetadata()`.
 * Aliased here so `detectDrift` types stay close to the SDK shape without
 * re-declaring nullable variants.
 */
type ISubscription = protos.google.pubsub.v1.ISubscription;

const ALREADY_EXISTS_GRPC = 6;
const ALREADY_EXISTS_HTTP = 409;
const NOT_FOUND_GRPC = 5;
const NOT_FOUND_HTTP = 404;

// GCP region names accepted by Pub/Sub's messageStoragePolicy.allowedPersistenceRegions.
// These are the canonical full names (e.g. 'europe-west1'), NOT the colloquial
// abbreviations 'eu-west1' that the API rejects with INVALID_ARGUMENT.
const DEFAULT_PERSISTENCE_REGIONS = [
  'europe-west1',
  'europe-west3',
  'europe-west4',
];

interface ErrorWithCode {
  code: number;
}

function hasNumericCode(err: unknown): err is ErrorWithCode {
  if (typeof err !== 'object' || err === null) return false;
  if (!('code' in err)) return false;
  const obj: { code?: unknown } = err;
  return typeof obj.code === 'number';
}

function isAlreadyExists(err: unknown): boolean {
  return (
    hasNumericCode(err) &&
    (err.code === ALREADY_EXISTS_GRPC || err.code === ALREADY_EXISTS_HTTP)
  );
}

function isNotFound(err: unknown): boolean {
  return (
    hasNumericCode(err) &&
    (err.code === NOT_FOUND_GRPC || err.code === NOT_FOUND_HTTP)
  );
}

export interface SetupResult {
  topicCreated: boolean;
  deadLetterTopicCreated: boolean;
  subscriptionCreated: boolean;
}

export const DEFAULT_SETUP: Setup = {};

interface EnsureTopicArgs {
  client: PubSub;
  projectId: string;
  name: string;
  storageRegions: string[];
  logger: Logger.Instance;
}

/**
 * Ensure the topic exists, creating it via the admin endpoint
 * `client.createTopic({ name, messageStoragePolicy })` when missing.
 *
 * Note: `topic.create(opts)` accepts only `CallOptions` and silently drops
 * topic metadata. The admin path is the only one that actually applies
 * `messageStoragePolicy` at creation time.
 */
async function ensureTopicExists(args: EnsureTopicArgs): Promise<boolean> {
  const { client, projectId, name, storageRegions, logger } = args;
  const topicHandle = client.topic(name);
  let exists = false;
  try {
    const [resolved] = await topicHandle.exists();
    exists = resolved;
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  if (exists) return false;

  const metadata: TopicMetadata = {
    name: `projects/${projectId}/topics/${name}`,
    messageStoragePolicy: { allowedPersistenceRegions: storageRegions },
  };
  try {
    await client.createTopic(metadata);
    logger.info(`Pub/Sub topic "${name}" created.`);
    return true;
  } catch (err) {
    if (isAlreadyExists(err)) return false;
    throw err;
  }
}

interface DriftField {
  field: string;
  declared: unknown;
  actual: unknown;
}

function detectDrift(declared: Setup, actual: ISubscription): DriftField[] {
  const drifts: DriftField[] = [];
  if (
    declared.ackDeadlineSeconds !== undefined &&
    actual.ackDeadlineSeconds !== undefined &&
    actual.ackDeadlineSeconds !== null &&
    declared.ackDeadlineSeconds !== actual.ackDeadlineSeconds
  ) {
    drifts.push({
      field: 'ackDeadlineSeconds',
      declared: declared.ackDeadlineSeconds,
      actual: actual.ackDeadlineSeconds,
    });
  }
  if (
    declared.filter !== undefined &&
    actual.filter !== undefined &&
    actual.filter !== null &&
    declared.filter !== actual.filter
  ) {
    drifts.push({
      field: 'filter',
      declared: declared.filter,
      actual: actual.filter,
    });
  }
  if (
    declared.enableMessageOrdering !== undefined &&
    actual.enableMessageOrdering !== undefined &&
    actual.enableMessageOrdering !== null &&
    declared.enableMessageOrdering !== actual.enableMessageOrdering
  ) {
    drifts.push({
      field: 'enableMessageOrdering',
      declared: declared.enableMessageOrdering,
      actual: actual.enableMessageOrdering,
    });
  }
  if (declared.deadLetterPolicy && actual.deadLetterPolicy) {
    if (
      declared.deadLetterPolicy.deadLetterTopic !==
      actual.deadLetterPolicy.deadLetterTopic
    ) {
      drifts.push({
        field: 'deadLetterPolicy.deadLetterTopic',
        declared: declared.deadLetterPolicy.deadLetterTopic,
        actual: actual.deadLetterPolicy.deadLetterTopic,
      });
    }
    if (
      declared.deadLetterPolicy.maxDeliveryAttempts !== undefined &&
      actual.deadLetterPolicy.maxDeliveryAttempts !== undefined &&
      actual.deadLetterPolicy.maxDeliveryAttempts !== null &&
      declared.deadLetterPolicy.maxDeliveryAttempts !==
        actual.deadLetterPolicy.maxDeliveryAttempts
    ) {
      drifts.push({
        field: 'deadLetterPolicy.maxDeliveryAttempts',
        declared: declared.deadLetterPolicy.maxDeliveryAttempts,
        actual: actual.deadLetterPolicy.maxDeliveryAttempts,
      });
    }
  }
  if (declared.messageRetentionDuration && actual.messageRetentionDuration) {
    const actualRaw = actual.messageRetentionDuration;
    const declaredSeconds = declared.messageRetentionDuration.seconds;
    let actualSeconds: number | string | undefined;
    if (typeof actualRaw === 'number') {
      actualSeconds = actualRaw;
    } else if (typeof actualRaw === 'object' && actualRaw !== null) {
      const seconds: unknown = (actualRaw as { seconds?: unknown }).seconds;
      if (typeof seconds === 'number' || typeof seconds === 'string') {
        actualSeconds = seconds;
      }
    }
    if (
      typeof actualSeconds === 'number' &&
      declaredSeconds !== actualSeconds
    ) {
      drifts.push({
        field: 'messageRetentionDuration.seconds',
        declared: declaredSeconds,
        actual: actualSeconds,
      });
    } else if (
      typeof actualSeconds === 'string' &&
      String(declaredSeconds) !== actualSeconds
    ) {
      drifts.push({
        field: 'messageRetentionDuration.seconds',
        declared: declaredSeconds,
        actual: actualSeconds,
      });
    }
  }
  return drifts;
}

function buildSubscriptionCreateOptions(
  setup: Setup,
): CreateSubscriptionOptions {
  const opts: CreateSubscriptionOptions = {};
  if (setup.ackDeadlineSeconds !== undefined)
    opts.ackDeadlineSeconds = setup.ackDeadlineSeconds;
  if (setup.messageRetentionDuration)
    opts.messageRetentionDuration = setup.messageRetentionDuration;
  if (setup.filter) opts.filter = setup.filter;
  if (setup.deadLetterPolicy) {
    opts.deadLetterPolicy = {
      deadLetterTopic: setup.deadLetterPolicy.deadLetterTopic,
      maxDeliveryAttempts: setup.deadLetterPolicy.maxDeliveryAttempts,
    };
  }
  if (setup.retryPolicy) opts.retryPolicy = setup.retryPolicy;
  if (setup.enableMessageOrdering !== undefined)
    opts.enableMessageOrdering = setup.enableMessageOrdering;
  if (setup.labels) opts.labels = setup.labels;
  if (setup.expirationPolicy) opts.expirationPolicy = setup.expirationPolicy;
  return opts;
}

type WideConfig = Config;

export const setup: SetupFn = async (context) => {
  const { config, logger } = context;
  const wideConfig: WideConfig = config;

  const resolved = resolveSetup<Setup>(wideConfig.setup, DEFAULT_SETUP);
  if (!resolved) {
    logger.debug('Pub/Sub source setup skipped (config.setup is falsy).');
    return undefined;
  }

  const settings = wideConfig.settings;
  if (!settings) return logger.throw('settings missing, cannot run setup');

  const { client, projectId, subscription, topic } = settings;
  if (!client) return logger.throw('client is missing, cannot run setup');
  if (!projectId) return logger.throw('projectId is missing');
  if (!subscription) return logger.throw('subscription is missing');

  let topicCreated = false;
  let deadLetterTopicCreated = false;
  let subscriptionCreated = false;

  if (resolved.createTopic) {
    if (!topic)
      return logger.throw(
        'setup.createTopic is true but settings.topic is missing',
      );
    topicCreated = await ensureTopicExists({
      client,
      projectId,
      name: topic,
      storageRegions: DEFAULT_PERSISTENCE_REGIONS,
      logger,
    });
  }

  if (resolved.deadLetterPolicy?.createDeadLetterTopic) {
    deadLetterTopicCreated = await ensureTopicExists({
      client,
      projectId,
      name: resolved.deadLetterPolicy.deadLetterTopic,
      storageRegions: DEFAULT_PERSISTENCE_REGIONS,
      logger,
    });
  }

  const subscriptionOptions = buildSubscriptionCreateOptions(resolved);

  try {
    if (!topic) {
      // Cannot create a subscription without a topic binding; skip create
      // and fall through to drift detection on the existing subscription.
      logger.debug(
        'Pub/Sub setup: settings.topic absent, skipping createSubscription; checking drift only.',
      );
    } else {
      await client.createSubscription(topic, subscription, subscriptionOptions);
      subscriptionCreated = true;
      logger.info(
        `Pub/Sub subscription "${subscription}" created on topic "${topic}".`,
      );
    }
  } catch (err) {
    if (!isAlreadyExists(err)) {
      throw err;
    }
  }

  // Drift detection on the existing subscription.
  try {
    const sub = client.subscription(subscription);
    const [metadata] = await sub.getMetadata();
    const drifts = detectDrift(resolved, metadata ?? {});
    for (const drift of drifts) {
      logger.warn('setup.drift', drift);
    }
  } catch (err) {
    logger.debug('Pub/Sub setup: drift detection skipped', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const result: SetupResult = {
    topicCreated,
    deadLetterTopicCreated,
    subscriptionCreated,
  };
  return result;
};
