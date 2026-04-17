import type {
  Config,
  Settings,
  RedisSettings,
  PartialConfig,
  Env,
} from './types';
import type { Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const raw = (partialConfig.settings ?? {}) as Partial<Settings>;
  const redis: Partial<RedisSettings> =
    raw.redis ?? ({} as Partial<RedisSettings>);

  if (!redis.streamKey) {
    logger.throw('Config settings redis.streamKey missing');
  }

  const redisSettings: RedisSettings = {
    ...redis,
    streamKey: redis.streamKey as string,
    serialization: redis.serialization ?? 'json',
  };

  const settings: Settings = { redis: redisSettings };

  return { ...partialConfig, settings };
}

export function isRedisEnv(env: unknown): env is Env {
  if (!isObject(env)) return false;
  const maybe = env as { Redis?: { Client?: unknown } };
  return typeof maybe.Redis?.Client === 'function';
}
