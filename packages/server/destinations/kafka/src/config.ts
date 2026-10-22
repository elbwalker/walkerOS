import type {
  Config,
  Settings,
  KafkaSettings,
  PartialConfig,
  Env,
  CompressionType,
  CompressionTypesMap,
} from './types';
import { isObject, StepError } from '@walkeros/core';

/** Fallback compression codec map when env is not provided. */
const COMPRESSION_FALLBACK: Record<CompressionType, number> = {
  none: 0,
  gzip: 1,
  snappy: 2,
  lz4: 3,
  zstd: 4,
};

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const raw: Partial<Settings> = partialConfig.settings ?? {};
  const kafka: Partial<KafkaSettings> = raw.kafka ?? {};

  const { brokers, topic } = kafka;
  if (!brokers || brokers.length === 0 || !topic) {
    const missing = [
      ...(brokers && brokers.length ? [] : ['kafka.brokers']),
      ...(topic ? [] : ['kafka.topic']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  const kafkaSettings: KafkaSettings = {
    ...kafka,
    brokers,
    topic,
    clientId: kafka.clientId ?? 'walkeros',
    acks: kafka.acks ?? -1,
    compression: kafka.compression ?? 'gzip',
    idempotent: kafka.idempotent ?? false,
    allowAutoTopicCreation: kafka.allowAutoTopicCreation ?? false,
  };

  const settings: Settings = { kafka: kafkaSettings };

  return { ...partialConfig, settings };
}

export function getCompressionType(
  compression: CompressionType | undefined,
  env: Env | undefined,
): number {
  const codec = compression ?? 'gzip';
  if (codec === 'none') return 0;

  const types: CompressionTypesMap | undefined = env?.Kafka?.CompressionTypes;
  if (types) {
    const lookup: Record<CompressionType, number> = {
      none: types.None,
      gzip: types.GZIP,
      snappy: types.Snappy,
      lz4: types.LZ4,
      zstd: types.ZSTD,
    };
    return lookup[codec] ?? types.GZIP;
  }

  return COMPRESSION_FALLBACK[codec] ?? 1;
}

export function isKafkaEnv(env: unknown): env is Env {
  if (!isObject(env)) return false;
  const maybe = env as { Kafka?: { Kafka?: unknown } };
  return typeof maybe.Kafka?.Kafka === 'function';
}
