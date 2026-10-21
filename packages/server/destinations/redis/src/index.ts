import type {
  Destination,
  Settings,
  Env,
  RedisClientMock,
  RedisClientConstructor,
  RedisClientOptions,
} from './types';
import { StepError } from '@walkeros/core';
import { getConfig, isRedisEnv } from './config';
import { push } from './push';

// Types re-export
export * as DestinationRedis from './types';

export const destinationRedis: Destination = {
  type: 'redis',

  config: {},

  async init({ config: partialConfig, env, reportError }) {
    const config = getConfig(partialConfig);
    const settings = config.settings as Settings;
    const redis = settings.redis;

    // Skip creation if a client has already been wired in (testing).
    if (redis._client) return config;

    let Constructor: RedisClientConstructor | undefined;

    // Prefer env-injected constructor (testing, dependency injection).
    if (isRedisEnv(env)) {
      const envTyped = env as Env;
      Constructor = envTyped.Redis?.Client;
    }

    // Production path: load real ioredis SDK.
    if (!Constructor) {
      try {
        // Use dynamic require to allow tests to mock via jest.mock('ioredis').
        const ioredis = require('ioredis') as {
          default?: RedisClientConstructor;
          Redis?: RedisClientConstructor;
        };
        // ioredis exports the class as default (ESM) and as named Redis export.
        Constructor = ioredis.default ?? ioredis.Redis;
      } catch (err) {
        throw new StepError('Failed to load ioredis', {
          code: 'not-ready',
          cause: err,
        });
      }
    }

    if (!Constructor)
      throw new StepError('ioredis constructor not found', {
        code: 'not-ready',
      });

    let client: RedisClientMock;
    if (redis.url) {
      client = new Constructor(redis.url);
    } else {
      client = new Constructor(redis.options ?? ({} as RedisClientOptions));
    }

    // ioredis reports a lost connection as an `error` event; without a
    // listener it is unhandled. A failed XADD still fails its own push.
    client.on?.('error', (err) => reportError?.(err));

    redis._client = client;
    redis._ownedClient = true;

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const settings = config?.settings as Settings | undefined;
    const redis = settings?.redis;
    if (!redis) return;

    const client = redis._client;
    // Only close clients the destination created (not user-provided)
    if (client && redis._ownedClient) {
      try {
        // A client that is not connected would queue QUIT behind its unsent
        // commands and never answer: close it at once instead.
        if (client.status && client.status !== 'ready' && client.disconnect)
          client.disconnect();
        else await client.quit();
      } finally {
        redis._client = undefined;
        redis._ownedClient = undefined;
      }
    }
  },
};

export default destinationRedis;
