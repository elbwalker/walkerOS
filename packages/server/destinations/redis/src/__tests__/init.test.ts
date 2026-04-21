jest.mock('ioredis', () => ({
  __esModule: true,
  default: class {
    constructor(_urlOrOptions: unknown) {}
    xadd() {
      return Promise.resolve('1700000100000-0');
    }
    pipeline() {
      return {
        xadd: () => this,
        exec: () => Promise.resolve([]),
      };
    }
    quit() {
      return Promise.resolve('OK');
    }
    on() {
      return this;
    }
  },
}));

import { destinationRedis } from '..';
import type { Settings, RedisClientMock } from '../types';

function makeLogger() {
  return {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn((msg: string) => {
      throw new Error(msg);
    }),
  };
}

describe('init', () => {
  it('throws when streamKey is missing', async () => {
    const logger = makeLogger();

    await expect(
      destinationRedis.init!({
        config: { settings: { redis: {} } },
        logger,
        id: 'test',
      } as never),
    ).rejects.toThrow('streamKey');
  });

  it('creates a client on valid config', async () => {
    const logger = makeLogger();
    const result = await destinationRedis.init!({
      config: {
        settings: {
          redis: {
            streamKey: 'walkeros:events',
            url: 'redis://localhost:6379',
          },
        },
      },
      logger,
      id: 'test',
    } as never);

    const settings = (result as { settings: Settings }).settings;
    expect(settings.redis._client).toBeDefined();
    expect(settings.redis._ownedClient).toBe(true);
  });

  it('uses options when url is not provided', async () => {
    const logger = makeLogger();
    const result = await destinationRedis.init!({
      config: {
        settings: {
          redis: {
            streamKey: 'walkeros:events',
            options: { host: 'localhost', port: 6379 },
          },
        },
      },
      logger,
      id: 'test',
    } as never);

    const settings = (result as { settings: Settings }).settings;
    expect(settings.redis._client).toBeDefined();
  });

  it('preserves pre-wired client without creating a new one', async () => {
    const logger = makeLogger();
    const preWired: RedisClientMock = {
      xadd: () => Promise.resolve('0-0'),
      pipeline: () => ({
        xadd: function () {
          return this;
        },
        exec: () => Promise.resolve([]),
      }),
      quit: () => Promise.resolve('OK'),
    };

    const result = await destinationRedis.init!({
      config: {
        settings: {
          redis: { streamKey: 'walkeros:events', _client: preWired },
        },
      },
      logger,
      id: 'test',
    } as never);

    const settings = (result as { settings: Settings }).settings;
    expect(settings.redis._client).toBe(preWired);
    expect(settings.redis._ownedClient).toBeUndefined();
  });
});

describe('destroy', () => {
  it('calls quit on owned client and clears the reference', async () => {
    const quit = jest.fn().mockResolvedValue('OK');
    const settings: Settings = {
      redis: {
        streamKey: 'walkeros:events',
        _client: {
          xadd: () => Promise.resolve('0-0'),
          pipeline: () => ({
            xadd: function () {
              return this;
            },
            exec: () => Promise.resolve([]),
          }),
          quit,
        },
        _ownedClient: true,
      },
    };

    await destinationRedis.destroy!({ config: { settings } } as never);

    expect(quit).toHaveBeenCalledTimes(1);
    expect(settings.redis._client).toBeUndefined();
    expect(settings.redis._ownedClient).toBeUndefined();
  });

  it('does not close user-provided client', async () => {
    const quit = jest.fn().mockResolvedValue('OK');
    const settings: Settings = {
      redis: {
        streamKey: 'walkeros:events',
        _client: {
          xadd: () => Promise.resolve('0-0'),
          pipeline: () => ({
            xadd: function () {
              return this;
            },
            exec: () => Promise.resolve([]),
          }),
          quit,
        },
        _ownedClient: false,
      },
    };

    await destinationRedis.destroy!({ config: { settings } } as never);

    expect(quit).not.toHaveBeenCalled();
  });

  it('does nothing when no client exists', async () => {
    const settings: Settings = {
      redis: { streamKey: 'walkeros:events' },
    };
    await destinationRedis.destroy!({ config: { settings } } as never);
  });
});
