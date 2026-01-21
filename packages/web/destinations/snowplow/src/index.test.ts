import type { WalkerOS } from '@walkeros/core';
import type { DestinationSnowplow } from '.';
import type { DestinationWeb } from '@walkeros/web-core';
import { startFlow } from '@walkeros/collector';
import { getEvent, mockEnv } from '@walkeros/core';
import { examples } from '.';

const { events, mapping } = examples;

describe('destination snowplow', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationSnowplow.Destination;

  let calls: Array<{ path: string[]; args: unknown[] }>;
  let testEnv: DestinationWeb.Env;

  beforeEach(async () => {
    destination = jest.requireActual('.').default;

    jest.clearAllMocks();
    calls = [];

    // Create test environment with call interceptor
    testEnv = mockEnv(examples.env.push, (path, args) => {
      calls.push({ path, args });
    });

    ({ elb } = await startFlow({
      tagging: 2,
    }));
  });

  test('init creates tracker', async () => {
    // Use testEnv (which is already set up with mockEnv and call tracking)
    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
        appId: 'test-app',
      },
    });

    await elb(getEvent());

    // After init, snowplow should have been called with 'newTracker'
    const initCall = calls.find(
      (c) =>
        c.path.join('.') === 'window.snowplow' && c.args[0] === 'newTracker',
    );
    expect(initCall).toBeDefined();
    expect(initCall?.args[1]).toBe('sp'); // trackerName
    expect(initCall?.args[2]).toBe('https://collector.example.com'); // collectorUrl
  });

  test('init handles missing collector URL', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {}, // No collectorUrl
    });

    await elb(getEvent());

    // logger.throw logs error and throws, collector catches and logs
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[snowplow]'),
      'Config settings collectorUrl missing',
    );
    consoleErrorSpy.mockRestore();
  });

  test('event transaction (default)', async () => {
    const event = getEvent('order complete');

    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
      },
      mapping: mapping.config,
    });

    await elb(event);

    expect(calls).toContainEqual({
      path: ['window', 'snowplow'],
      args: events.transaction(),
    });
  });

  test('event page view', async () => {
    const event = getEvent('page view', {
      title: 'Home',
      path: '/',
    });

    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
      },
      mapping: mapping.config,
    });

    await elb(event);

    expect(calls).toContainEqual({
      path: ['window', 'snowplow'],
      args: events.pageView(),
    });
  });

  test('event product view', async () => {
    const event = getEvent('product view');

    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
      },
      mapping: mapping.config,
    });

    await elb(event);

    expect(calls).toContainEqual({
      path: ['window', 'snowplow'],
      args: events.productView(),
    });
  });

  test('event purchase', async () => {
    const event = getEvent('order complete');

    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
      },
      mapping: mapping.config,
    });

    await elb(event);

    expect(calls).toContainEqual({
      path: ['window', 'snowplow'],
      args: events.purchase(),
    });
  });

  test('event without mapping is skipped', async () => {
    // Test that events without mapping configuration are silently skipped
    const event = getEvent('custom unmapped');

    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
      },
      mapping: mapping.config,
    });

    await elb(event);

    // Should only have newTracker call, no event tracking
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0]).toBe('newTracker');
  });

  test('handles event without action mapping', async () => {
    // Events with mapping but no action type are silently skipped
    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
      },
      mapping: {
        custom: {
          event: {
            // Mapping exists but no action specified
            data: { map: { id: 'data.id' } },
          },
        },
      },
    });

    // Send event that has mapping but no action
    await elb('custom event', { id: '123' });

    // Should only have newTracker call, event without action is skipped
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0]).toBe('newTracker');
  });
});
