// setup.ts
//
// Provision a Kafka topic idempotently. Triggered only by `walkeros setup
// destination.<id>`. Never auto-runs.
//
// NO SAFE DEFAULTS for `numPartitions` or `replicationFactor`: these are
// cluster-specific operational decisions and depend on broker count,
// expected throughput, and consumer parallelism. The boolean form
// (setup: true) is rejected at runtime; only the object form is valid.
import type { DestinationServer } from '@walkeros/server-core';
import type { LifecycleContext, Logger } from '@walkeros/core';
import type {
  Env,
  KafkaAdminMock,
  KafkaClientConstructor,
  Setup,
  Types,
} from './types';
import { isKafkaEnv } from './config';
import { registerSchema } from './schemaRegistry';

type WideConfig = DestinationServer.Config<Types>;

export interface SetupResult {
  topicCreated: boolean;
  schemaRegistered: boolean;
}

const TOPIC_ALREADY_EXISTS_CODE = 36;
const TOPIC_ALREADY_EXISTS_TYPE = 'TopicAlreadyExistsError';
const CONFIG_RESOURCE_TYPE_TOPIC = 2;

/**
 * Provision a Kafka topic idempotently.
 *
 * NO SAFE DEFAULTS for `numPartitions` or `replicationFactor`.
 * `setup: true` is rejected at runtime; only the object form is valid.
 */
export async function setup(
  ctx: LifecycleContext<WideConfig, Env>,
): Promise<SetupResult> {
  const { config, env, logger } = ctx;

  // The focal idiom of this package: NO SAFE DEFAULTS.
  if (config.setup === true) {
    throw new Error(
      'kafka destination setup requires explicit options: ' +
        '{ topic, numPartitions, replicationFactor }. ' +
        'There is no safe default for partition count or replication factor, ' +
        'these depend on your cluster topology. ' +
        'See https://www.walkeros.io/docs/destinations/server/kafka#setup for guidance.',
    );
  }

  if (!config.setup || typeof config.setup !== 'object') {
    // setup is false or unset; the CLI should have skipped before reaching here.
    // Defensive return so direct callers do not accidentally provision.
    return { topicCreated: false, schemaRegistered: false };
  }

  const options: Setup = config.setup;

  // Required field validation, with actionable messages.
  if (typeof options.numPartitions !== 'number') {
    throw new Error(
      'kafka setup: `numPartitions` is required. No safe default. ' +
        'Choose based on expected throughput and consumer parallelism.',
    );
  }
  if (typeof options.replicationFactor !== 'number') {
    const brokerList = config.settings?.kafka?.brokers?.join(',') ?? 'unknown';
    throw new Error(
      'kafka setup: `replicationFactor` is required. No safe default. ' +
        'Must be <= broker count for cluster <' +
        brokerList +
        '>.',
    );
  }

  const topic = options.topic || config.settings?.kafka?.topic;
  if (!topic) {
    throw new Error(
      'kafka setup: topic is required (in `setup.topic` or `settings.kafka.topic`).',
    );
  }

  const brokers = config.settings?.kafka?.brokers;
  if (!brokers || brokers.length === 0) {
    throw new Error(
      'kafka setup: `settings.kafka.brokers` is required to reach the cluster.',
    );
  }

  const numPartitions = options.numPartitions;
  const replicationFactor = options.replicationFactor;

  // Construct a kafkajs client (env-injected for tests; real SDK in production).
  const Constructor = resolveKafkaConstructor(env, logger);
  const client = new Constructor({
    clientId: config.settings?.kafka?.clientId ?? 'walkeros-setup',
    brokers,
    ssl: config.settings?.kafka?.ssl,
    sasl: config.settings?.kafka?.sasl,
  });

  const admin = client.admin();
  await admin.connect();

  let topicCreated = false;
  try {
    const validateOnly = options.validateOnly ?? false;
    const configEntries = options.configEntries
      ? Object.entries(options.configEntries).map(([name, value]) => ({
          name,
          value,
        }))
      : undefined;

    try {
      const created = await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions,
            replicationFactor,
            ...(configEntries ? { configEntries } : {}),
          },
        ],
        validateOnly,
      });
      topicCreated = created === true && !validateOnly;
      if (validateOnly) {
        logger.info('setup: validateOnly mode, no topic created', { topic });
      } else if (topicCreated) {
        logger.info('setup: topic created', {
          topic,
          numPartitions,
          replicationFactor,
        });
      } else {
        logger.debug(
          'setup: topic already exists (createTopics returned false)',
          { topic },
        );
      }
    } catch (err) {
      if (isAlreadyExists(err)) {
        logger.debug('setup: topic already exists (race)', { topic });
      } else {
        throw err;
      }
    }

    // Drift detection only when the topic is real (not validateOnly).
    if (!validateOnly) {
      await detectDrift(
        admin,
        topic,
        {
          numPartitions,
          replicationFactor,
          configEntries: options.configEntries,
        },
        logger,
      );
    }

    // Schema registry (optional).
    let schemaRegistered = false;
    if (options.schemaRegistry) {
      schemaRegistered = await registerSchema(options.schemaRegistry, logger);
    }

    return { topicCreated, schemaRegistered };
  } finally {
    await admin.disconnect();
  }
}

function resolveKafkaConstructor(
  env: Env,
  logger: Logger.Instance,
): KafkaClientConstructor {
  if (isKafkaEnv(env) && env.Kafka?.Kafka) {
    return env.Kafka.Kafka;
  }
  try {
    const kafkajs: { Kafka: KafkaClientConstructor } = require('kafkajs');
    return kafkajs.Kafka;
  } catch (err) {
    logger.throw(`Failed to load kafkajs: ${String(err)}`);
    // logger.throw is `never`; this line is unreachable but satisfies TS.
    throw err;
  }
}

function isAlreadyExists(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const obj: { code?: unknown; type?: unknown } = err;
  if (obj.code === TOPIC_ALREADY_EXISTS_CODE) return true;
  if (obj.type === TOPIC_ALREADY_EXISTS_TYPE) return true;
  return false;
}

interface DriftDeclared {
  numPartitions: number;
  replicationFactor: number;
  configEntries?: Record<string, string>;
}

async function detectDrift(
  admin: KafkaAdminMock,
  topic: string,
  declared: DriftDeclared,
  logger: Logger.Instance,
): Promise<void> {
  // Partition count + replication factor from fetchTopicMetadata.
  try {
    const meta = await admin.fetchTopicMetadata({ topics: [topic] });
    const t = meta.topics[0];
    if (t) {
      const actualPartitions = t.partitions.length;
      if (actualPartitions !== declared.numPartitions) {
        logger.warn('setup.drift', {
          field: 'numPartitions',
          declared: declared.numPartitions,
          actual: actualPartitions,
        });
      }
      const actualReplication = t.partitions[0]?.replicas.length ?? 0;
      if (actualReplication !== declared.replicationFactor) {
        logger.warn('setup.drift', {
          field: 'replicationFactor',
          declared: declared.replicationFactor,
          actual: actualReplication,
        });
      }
    }
  } catch (err) {
    logger.debug('setup: drift check (metadata) failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // configEntries drift, granular per-key.
  if (
    declared.configEntries &&
    Object.keys(declared.configEntries).length > 0
  ) {
    try {
      const cfg = await admin.describeConfigs({
        resources: [{ type: CONFIG_RESOURCE_TYPE_TOPIC, name: topic }],
      });
      const actualEntries = cfg.resources[0]?.configEntries ?? [];
      const actualMap = new Map(
        actualEntries.map((e) => [e.configName, e.configValue]),
      );
      for (const [key, declaredValue] of Object.entries(
        declared.configEntries,
      )) {
        const actual = actualMap.get(key);
        if (actual !== declaredValue) {
          logger.warn('setup.drift', {
            field: `configEntries.${key}`,
            declared: declaredValue,
            actual: actual ?? null,
          });
        }
      }
    } catch (err) {
      logger.debug('setup: drift check (configs) failed (non-fatal)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
