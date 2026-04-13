jest.mock('@amplitude/analytics-node', () => ({
  __esModule: true,
}));

import type { Collector } from '@walkeros/core';
import { createMockLogger, clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Config, Destination, Env, Settings } from '../types';

describe('Server Destination Amplitude', () => {
  let destination: Destination;

  beforeEach(() => {
    destination = jest.requireActual('../').default;
  });

  test('init throws without apiKey', async () => {
    const env = clone(examples.env.push) as Env;
    await expect(
      destination.init({
        config: {},
        collector: {} as Collector.Instance,
        env,
        logger: createMockLogger(),
        id: 'test-amplitude',
      }),
    ).rejects.toThrow('apiKey missing');
  });

  test('init succeeds with apiKey', async () => {
    const initSpy = jest.fn(() => ({ promise: Promise.resolve() }));
    const env: Env = {
      amplitude: {
        ...examples.env.push.amplitude!,
        init: initSpy,
      },
    };
    const config = (await destination.init({
      config: { settings: { apiKey: 'test-key' } },
      collector: {} as Collector.Instance,
      env,
      logger: createMockLogger(),
      id: 'test-amplitude',
    })) as Config;
    expect(config.settings.apiKey).toBe('test-key');
    expect(initSpy).toHaveBeenCalledWith('test-key', expect.any(Object));
  });

  test('init passes through SDK options', async () => {
    const initSpy = jest.fn(() => ({ promise: Promise.resolve() }));
    const env: Env = {
      amplitude: {
        ...examples.env.push.amplitude!,
        init: initSpy,
      },
    };
    await destination.init({
      config: {
        settings: {
          apiKey: 'test-key',
          serverZone: 'EU',
          useBatch: true,
          flushQueueSize: 500,
        } as Partial<Settings>,
      },
      collector: {} as Collector.Instance,
      env,
      logger: createMockLogger(),
      id: 'test-amplitude',
    });
    expect(initSpy).toHaveBeenCalledWith(
      'test-key',
      expect.objectContaining({
        serverZone: 'EU',
        useBatch: true,
        flushQueueSize: 500,
      }),
    );
  });

  test('init does not pass walkerOS-specific keys to SDK', async () => {
    const initSpy = jest.fn(() => ({ promise: Promise.resolve() }));
    const env: Env = {
      amplitude: {
        ...examples.env.push.amplitude!,
        init: initSpy,
      },
    };
    await destination.init({
      config: {
        settings: {
          apiKey: 'test-key',
          identify: { map: { user_id: 'user.id' } },
          eventOptions: { map: { time: 'timestamp' } },
          include: ['data'],
        } as Partial<Settings>,
      },
      collector: {} as Collector.Instance,
      env,
      logger: createMockLogger(),
      id: 'test-amplitude',
    });
    const nodeOptions = (initSpy.mock.calls as unknown[][])[0][1] as Record<
      string,
      unknown
    >;
    expect(nodeOptions).not.toHaveProperty('identify');
    expect(nodeOptions).not.toHaveProperty('eventOptions');
    expect(nodeOptions).not.toHaveProperty('include');
    expect(nodeOptions).not.toHaveProperty('apiKey');
  });

  test('destroy calls flush', async () => {
    const flushSpy = jest.fn(() => ({ promise: Promise.resolve() }));
    const env: Env = {
      amplitude: {
        ...examples.env.push.amplitude!,
        flush: flushSpy,
      },
    };
    await destination.destroy!({
      config: { settings: { apiKey: 'test-key' } } as Config,
      env,
      logger: createMockLogger(),
      id: 'test-amplitude',
    });
    expect(flushSpy).toHaveBeenCalled();
  });
});
