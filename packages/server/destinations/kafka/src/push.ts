import type {
  PushFn,
  KafkaSettings,
  Env,
  ProducerMessage,
  ProducerRecord,
  KafkaProducerMock,
} from './types';
import type { Collector } from '@walkeros/core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
import { getCompressionType } from './config';

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const settings = config.settings as { kafka?: KafkaSettings } | undefined;
  const kafka: KafkaSettings | undefined = settings?.kafka;

  if (!kafka) {
    logger.warn('Kafka settings missing');
    return;
  }

  const producer = kafka._producer;
  if (!producer) {
    logger.warn('Kafka producer not initialized');
    return;
  }

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

  logger.debug('Kafka push', { topic, key, event: eventName });

  try {
    await (producer as KafkaProducerMock).send(record);
  } catch (error) {
    logger.error('Kafka push failed', {
      topic,
      error: error instanceof Error ? error.message : String(error),
      event: eventName,
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
