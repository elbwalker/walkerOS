import type {
  Config,
  Settings,
  RedisSettings,
  PartialConfig,
  Env,
} from './types';
import { isObject, StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const raw = (partialConfig.settings ?? {}) as Partial<Settings>;
  const redis: Partial<RedisSettings> =
    raw.redis ?? ({} as Partial<RedisSettings>);

  if (!redis.streamKey)
    throw new StepError('Config settings redis.streamKey missing', {
      code: 'config',
    });

  const redisSettings: RedisSettings = {
    ...redis,
    streamKey: redis.streamKey,
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
