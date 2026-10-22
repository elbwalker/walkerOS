import type {
  Config,
  Settings,
  RedisSettings,
  PartialConfig,
  Env,
} from './types';
import { isObject, StepError } from '@walkeros/core';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const raw: Partial<Settings> = partialConfig.settings ?? {};
  const redis: Partial<RedisSettings> = raw.redis ?? {};

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
  return (
    isObject(env) &&
    isObject(env.Redis) &&
    typeof env.Redis.Client === 'function'
  );
}
