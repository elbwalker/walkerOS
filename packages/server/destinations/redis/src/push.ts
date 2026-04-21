import type {
  PushFn,
  RedisSettings,
  RedisClientMock,
  XaddArg,
  SerializationMode,
} from './types';
import { isString } from '@walkeros/core';

export const push: PushFn = async function (event, { config, rule, logger }) {
  const settings = config.settings as { redis?: RedisSettings } | undefined;
  const redis: RedisSettings | undefined = settings?.redis;

  if (!redis) {
    logger.warn('Redis settings missing');
    return;
  }

  const client = redis._client;
  if (!client) {
    logger.warn('Redis client not initialized');
    return;
  }

  // Derive stream key: rule override -> destination default
  const ruleSettings = rule?.settings ?? {};
  const streamKey = isString(ruleSettings.streamKey)
    ? ruleSettings.streamKey
    : redis.streamKey;

  const serialization: SerializationMode = redis.serialization ?? 'json';

  // Serialize event
  const fields: string[] =
    serialization === 'flat'
      ? flattenEvent(event as unknown as Record<string, unknown>)
      : ['event', JSON.stringify(event)];

  // Build XADD arguments
  const args: XaddArg[] = [streamKey];

  // Optional MAXLEN trimming
  if (redis.maxLen) {
    args.push('MAXLEN');
    if (!redis.exactTrimming) args.push('~');
    args.push(redis.maxLen);
  }

  args.push('*'); // Auto-generate entry ID
  args.push(...fields); // Field-value pairs

  logger.debug('Redis XADD', { stream: streamKey });

  try {
    const entryId = await (client as RedisClientMock).xadd(...args);
    logger.debug('Redis XADD complete', { stream: streamKey, entryId });
  } catch (error) {
    logger.error('Redis XADD failed', {
      stream: streamKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

function flattenEvent(event: Record<string, unknown>): string[] {
  const fields: string[] = [];
  for (const [key, value] of Object.entries(event)) {
    fields.push(
      key,
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value),
    );
  }
  return fields;
}
