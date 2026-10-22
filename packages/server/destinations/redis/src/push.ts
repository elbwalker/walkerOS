import type {
  PushFn,
  RedisSettings,
  XaddArg,
  SerializationMode,
} from './types';
import { isString, StepError } from '@walkeros/core';

// A silent rule has no XADD of its own: nothing to append.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await append(event, context);
};

const append: PushFn = async function (event, { config, rule, logger }) {
  const settings = config.settings;
  const client = settings?.redis?._client;
  if (!settings?.redis || !client)
    throw new StepError('Redis client not initialized', { code: 'not-ready' });
  const redis: RedisSettings = settings.redis;

  // Derive stream key: rule override -> destination default
  const ruleSettings = rule?.settings ?? {};
  const streamKey = isString(ruleSettings.streamKey)
    ? ruleSettings.streamKey
    : redis.streamKey;

  const serialization: SerializationMode = redis.serialization ?? 'json';

  // Serialize event
  const fields: string[] =
    serialization === 'flat'
      ? flattenEvent(event)
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

  let entryId: string | null;
  try {
    entryId = await client.xadd(...args);
  } catch (error) {
    // The collector reports it; the client's own message stays the cause.
    throw new StepError('Redis XADD failed', {
      code: 'transport',
      cause: error,
    });
  }
  logger.debug('Redis XADD complete', { stream: streamKey, entryId });
};

function flattenEvent(event: object): string[] {
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
