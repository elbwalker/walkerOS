import type {
  PushFn,
  KafkaSettings,
  Env,
  ProducerMessage,
  ProducerRecord,
  KafkaProducerMock,
} from './types';
import type { Collector } from '@walkeros/core';
import { getMappingValue, isObject, isString, StepError } from '@walkeros/core';
import { getCompressionType } from './config';

const UNKNOWN_TOPIC_CODE = 3;
const UNKNOWN_TOPIC_TYPE = 'UNKNOWN_TOPIC_OR_PARTITION';

function hasCodeOrType(
  err: unknown,
): err is { code?: unknown; type?: unknown } {
  return (
    typeof err === 'object' && err !== null && ('code' in err || 'type' in err)
  );
}

function isUnknownTopicError(err: unknown): boolean {
  if (!hasCodeOrType(err)) return false;
  return err.code === UNKNOWN_TOPIC_CODE || err.type === UNKNOWN_TOPIC_TYPE;
}

/**
 * kafkajs's own classification of a failed send. Its errors carry
 * `retriable`; its retry wraps an error it gave up on: one no retry fixes
 * (MESSAGE_TOO_LARGE) stays not retriable, while running out of retries on
 * one it does retry (KafkaJSNumberOfRetriesExceeded, which carries
 * `retryCount`) can succeed at a later send. Undefined for any other error.
 */
function kafkaRetriable(error: unknown): boolean | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const retriable: unknown = Reflect.get(error, 'retriable');
  if (typeof retriable !== 'boolean') return undefined;
  if (typeof Reflect.get(error, 'retryCount') === 'number') return true;
  return retriable;
}

/**
 * The producer's connection, opened once at the first push; a failed
 * connect fails that push and is tried again at the next one.
 */
function connected(
  kafka: KafkaSettings,
  producer: KafkaProducerMock,
): Promise<void> {
  if (!kafka._connected) {
    const connecting = producer.connect().catch((error: unknown) => {
      throw new StepError('Kafka producer connect failed', {
        code: 'transport',
        cause: error,
      });
    });
    connecting.catch(() => {
      if (kafka._connected === connecting) kafka._connected = undefined;
    });
    kafka._connected = connecting;
  }
  return kafka._connected;
}

// A silent rule has no message of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger, id },
) {
  const kafka = config.settings?.kafka;
  const producer = kafka?._producer;
  if (!kafka || !producer)
    throw new StepError('Kafka producer not initialized', {
      code: 'not-ready',
    });

  // Derive event name (rule.name overrides)
  const eventName = isString(rule?.name) ? rule.name : event.name;

  // Derive topic: rule override -> destination default
  const ruleSettings = rule?.settings ?? {};
  const topic = isString(ruleSettings.topic) ? ruleSettings.topic : kafka.topic;

  // Derive message key
  const keyPath = isString(ruleSettings.key) ? ruleSettings.key : kafka.key;
  const key = await deriveKey(event, eventName, keyPath, collector);

  // Serialize message value: mapped data (when present) -> event
  const value =
    isObject(data) && Object.keys(data).length > 0
      ? JSON.stringify(data)
      : JSON.stringify(event);

  // Build headers
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(kafka.headers ?? {}),
  };

  // Resolve compression codec via env lookup
  const envTyped = env as Env | undefined;
  const compression = getCompressionType(kafka.compression, envTyped);

  const message: ProducerMessage = {
    key,
    value,
    headers,
    timestamp: String(event.timestamp ?? Date.now()),
  };

  const record: ProducerRecord = {
    topic,
    messages: [message],
    acks: kafka.acks ?? -1,
    compression,
  };

  if (kafka.timeout !== undefined) record.timeout = kafka.timeout;

  logger.debug('Kafka push', { topic, event: eventName });

  await connected(kafka, producer);
  try {
    await producer.send(record);
  } catch (error) {
    // The collector reports it; the client's own message stays the cause.
    if (isUnknownTopicError(error))
      throw new StepError(
        `Kafka topic "${topic}" not found on cluster ${kafka.brokers.join(',')}. ` +
          `Run "walkeros setup destination.${id}" with explicit ` +
          `{ numPartitions, replicationFactor } to create it.`,
        { code: 'config', cause: error },
      );
    throw new StepError('Kafka push failed', {
      code: 'transport',
      retryable: kafkaRetriable(error),
      cause: error,
    });
  }
};

async function deriveKey(
  event: Parameters<PushFn>[0],
  eventName: string,
  keyPath: string | undefined,
  collector: Collector.Instance,
): Promise<string> {
  if (keyPath) {
    const resolved = await getMappingValue(event, keyPath, { collector });
    if (isString(resolved) && resolved.length > 0) return resolved;
  }
  // Default: event name with space replaced for partition-friendly keys.
  return eventName.replace(/\s+/g, '_');
}
