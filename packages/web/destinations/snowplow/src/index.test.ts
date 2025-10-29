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
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {}, // No collectorUrl
    });

    await elb(getEvent());

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Snowplow] Collector URL is required',
    );
    consoleWarnSpy.mockRestore();
  });

  test('event structured (default)', async () => {
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

    await elb(getEvent());

    expect(calls).toContainEqual({
      path: ['window', 'snowplow'],
      args: events.structuredEvent(),
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
    const event = getEvent('product view', {
      id: 'P123',
      name: 'Laptop',
      price: 999,
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
      args: events.productView(),
    });
  });

  test('event purchase', async () => {
    const event = getEvent('order complete', {
      id: 'ORDER123',
      total: 1999,
      currency: 'USD',
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
      args: events.purchase(),
    });
  });

  test('event self-describing', async () => {
    const event = getEvent('product view', {
      id: 'P123',
      price: 999,
    });

    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
        eventMethod: 'self',
        schema: 'iglu:com.example/product_view/jsonschema/1-0-0',
      },
      mapping: {
        product: {
          view: examples.mapping.selfDescribingEvent,
        },
      },
    });

    await elb(event);

    expect(calls).toContainEqual({
      path: ['window', 'snowplow'],
      args: events.selfDescribingEvent(),
    });
  });

  test('handles invalid data gracefully', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
      },
    });

    // Send event with invalid data (will be filtered out by mapping)
    await elb('custom invalid', {});

    // Should warn about invalid data format
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Snowplow] Invalid data format',
    );
    consoleWarnSpy.mockRestore();
  });
});
