import type { WalkerOS } from '@walkeros/core';
import type { DestinationSnowplow } from '.';
import type { DestinationWeb } from '@walkeros/web-core';
import { startFlow } from '@walkeros/collector';
import { getEvent, mockEnv } from '@walkeros/core';
import {
  examples,
  clearUserData,
  enableAnonymousTracking,
  disableAnonymousTracking,
} from '.';
import { resetState } from './push';

const { events, mapping, walkerosEvents } = examples;

describe('destination snowplow', () => {
  let elb: WalkerOS.Elb;
  let destination: DestinationSnowplow.Destination;

  let calls: Array<{ path: string[]; args: unknown[] }>;
  let testEnv: DestinationWeb.Env;

  beforeEach(async () => {
    destination = jest.requireActual('.').default;

    jest.clearAllMocks();
    calls = [];

    // Reset global context state between tests
    resetState();

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

  test('init passes tracker configuration options', async () => {
    const destinationWithEnv = {
      ...destination,
      env: testEnv as DestinationSnowplow.Env,
    };
    elb('walker destination', destinationWithEnv, {
      settings: {
        collectorUrl: 'https://collector.example.com',
        appId: 'test-app',
        discoverRootDomain: true,
        cookieSameSite: 'Lax',
        appVersion: '1.0.0',
        contexts: {
          webPage: true,
          session: true,
        },
      },
    });

    await elb(getEvent());

    const initCall = calls.find(
      (c) =>
        c.path.join('.') === 'window.snowplow' && c.args[0] === 'newTracker',
    );
    expect(initCall).toBeDefined();
    expect(initCall?.args[3]).toMatchObject({
      appId: 'test-app',
      discoverRootDomain: true,
      cookieSameSite: 'Lax',
      appVersion: '1.0.0',
      contexts: {
        webPage: true,
        session: true,
      },
    });
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

  test('event add to cart with cart, page, and user entities', async () => {
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

    await elb(walkerosEvents.addToCart());

    expect(calls).toContainEqual({
      path: ['window', 'snowplow'],
      args: events.addToCart(),
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

  describe('setPageType', () => {
    test('called when page setting is configured', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          page: { type: 'globals.page_type' },
        },
        mapping: mapping.config,
      });

      await elb(
        getEvent('page view', {
          globals: { page_type: 'product' },
        }),
      );

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['setPageType', { type: 'product' }],
      });
    });

    test('only called once for same value', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          page: { type: 'globals.page_type' },
        },
        mapping: mapping.config,
      });

      // First event with page_type
      await elb(
        getEvent('page view', {
          globals: { page_type: 'product' },
        }),
      );

      // Second event with same page_type
      await elb(
        getEvent('product view', {
          globals: { page_type: 'product' },
        }),
      );

      // Count setPageType calls
      const setPageTypeCalls = calls.filter((c) => c.args[0] === 'setPageType');
      expect(setPageTypeCalls).toHaveLength(1);
    });

    test('called again when value changes', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          page: { type: 'globals.page_type' },
        },
        mapping: mapping.config,
      });

      // First event with page_type 'product'
      await elb(
        getEvent('page view', {
          globals: { page_type: 'product' },
        }),
      );

      // Second event with different page_type 'checkout'
      await elb(
        getEvent('page view', {
          globals: { page_type: 'checkout' },
        }),
      );

      // Should have two setPageType calls with different values
      const setPageTypeCalls = calls.filter((c) => c.args[0] === 'setPageType');
      expect(setPageTypeCalls).toHaveLength(2);
      expect(setPageTypeCalls[0].args[1]).toEqual({ type: 'product' });
      expect(setPageTypeCalls[1].args[1]).toEqual({ type: 'checkout' });
    });

    test('not called when type resolves to undefined', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          page: { type: 'globals.page_type' }, // Will be undefined if not in globals
        },
        mapping: mapping.config,
      });

      // Event without globals.page_type
      await elb(getEvent('page view'));

      const setPageTypeCalls = calls.filter((c) => c.args[0] === 'setPageType');
      expect(setPageTypeCalls).toHaveLength(0);
    });

    test('works with static value', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          page: { type: { value: 'homepage' } },
        },
        mapping: mapping.config,
      });

      await elb(getEvent('page view'));

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['setPageType', { type: 'homepage' }],
      });
    });

    test('includes language and locale when configured', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          page: {
            type: 'globals.page_type',
            language: 'globals.language',
            locale: { value: 'en-US' },
          },
        },
        mapping: mapping.config,
      });

      await elb(
        getEvent('page view', {
          globals: { page_type: 'product', language: 'en' },
        }),
      );

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: [
          'setPageType',
          { type: 'product', language: 'en', locale: 'en-US' },
        ],
      });
    });

    test('only includes language and locale when resolved to string', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          page: {
            type: 'globals.page_type',
            language: 'globals.language', // Will be undefined
            locale: 'globals.locale', // Will be undefined
          },
        },
        mapping: mapping.config,
      });

      await elb(
        getEvent('page view', {
          globals: { page_type: 'product' },
        }),
      );

      // Should only have type, not language or locale
      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['setPageType', { type: 'product' }],
      });
    });
  });

  describe('activityTracking', () => {
    test('enables activity tracking when configured', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          activityTracking: {
            minimumVisitLength: 10,
            heartbeatDelay: 30,
          },
        },
        mapping: mapping.config,
      });

      await elb(getEvent('page view'));

      const activityCall = calls.find(
        (c) => c.args[0] === 'enableActivityTracking',
      );
      expect(activityCall).toBeDefined();
      expect(activityCall?.args[1]).toEqual({
        minimumVisitLength: 10,
        heartbeatDelay: 30,
      });
    });

    test('activity tracking called before page view', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          activityTracking: {
            minimumVisitLength: 10,
            heartbeatDelay: 30,
          },
        },
        mapping: mapping.config,
      });

      await elb(getEvent('page view'));

      const activityIndex = calls.findIndex(
        (c) => c.args[0] === 'enableActivityTracking',
      );
      const pageViewIndex = calls.findIndex(
        (c) => c.args[0] === 'trackPageView',
      );

      expect(activityIndex).toBeLessThan(pageViewIndex);
    });

    test('no activity tracking when not configured', async () => {
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

      await elb(getEvent('page view'));

      const activityCall = calls.find(
        (c) => c.args[0] === 'enableActivityTracking',
      );
      expect(activityCall).toBeUndefined();
    });
  });

  describe('plugins', () => {
    test('loads URL-based plugin', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          plugins: [
            {
              url: 'https://cdn.example.com/link-click.js',
              name: ['snowplowLinkClickTracking', 'LinkClickTrackingPlugin'],
            },
          ],
        },
      });

      await elb(getEvent());

      const addPluginCall = calls.find((c) => c.args[0] === 'addPlugin');
      expect(addPluginCall).toBeDefined();
      expect(addPluginCall?.args[1]).toBe(
        'https://cdn.example.com/link-click.js',
      );
      expect(addPluginCall?.args[2]).toEqual([
        'snowplowLinkClickTracking',
        'LinkClickTrackingPlugin',
      ]);
    });

    test('derives enable method from plugin name', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          plugins: [
            {
              url: 'https://cdn.example.com/link-click.js',
              name: ['snowplowLinkClickTracking', 'LinkClickTrackingPlugin'],
              options: { trackContent: true },
            },
          ],
        },
      });

      await elb(getEvent());

      const enableCall = calls.find(
        (c) => c.args[0] === 'enableLinkClickTracking',
      );
      expect(enableCall).toBeDefined();
      expect(enableCall?.args[1]).toEqual({ trackContent: true });
    });

    test('uses custom enable method when provided', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          plugins: [
            {
              url: 'https://cdn.example.com/custom.js',
              name: ['customPlugin', 'CustomPlugin'],
              enableMethod: 'activateCustomPlugin',
              options: { enabled: true },
            },
          ],
        },
      });

      await elb(getEvent());

      const enableCall = calls.find(
        (c) => c.args[0] === 'activateCustomPlugin',
      );
      expect(enableCall).toBeDefined();
    });
  });

  describe('anonymousTracking', () => {
    test('enables anonymous tracking with boolean true', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          anonymousTracking: true,
        },
      });

      await elb(getEvent());

      const initCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'newTracker',
      );
      expect(initCall).toBeDefined();
      expect(initCall?.args[3]).toMatchObject({
        anonymousTracking: true,
      });
    });

    test('enables anonymous tracking with server anonymisation', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          anonymousTracking: {
            withServerAnonymisation: true,
          },
        },
      });

      await elb(getEvent());

      const initCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'newTracker',
      );
      expect(initCall).toBeDefined();
      expect(initCall?.args[3]).toMatchObject({
        anonymousTracking: {
          withServerAnonymisation: true,
        },
      });
    });

    test('enables anonymous tracking with session tracking', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          anonymousTracking: {
            withServerAnonymisation: true,
            withSessionTracking: true,
          },
        },
      });

      await elb(getEvent());

      const initCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'newTracker',
      );
      expect(initCall).toBeDefined();
      expect(initCall?.args[3]).toMatchObject({
        anonymousTracking: {
          withServerAnonymisation: true,
          withSessionTracking: true,
        },
      });
    });

    test('no anonymous tracking when not configured', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
      });

      await elb(getEvent());

      const initCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'newTracker',
      );
      expect(initCall).toBeDefined();
      // When not configured, anonymousTracking should be undefined/falsy
      expect(
        (initCall?.args[3] as Record<string, unknown>)?.anonymousTracking,
      ).toBeFalsy();
    });
  });

  describe('session context', () => {
    test('enables client_session context when session is true', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          contexts: {
            session: true,
          },
        },
      });

      await elb(getEvent());

      const initCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'newTracker',
      );
      expect(initCall).toBeDefined();
      expect(initCall?.args[3]).toMatchObject({
        contexts: {
          session: true,
        },
      });
    });
  });

  describe('setUserId', () => {
    test('calls setUserId when user.id is available', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          userId: 'user.id',
        },
        mapping: mapping.config,
      });

      await elb(
        getEvent('page view', {
          user: { id: 'user-123' },
        }),
      );

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['setUserId', 'user-123'],
      });
    });

    test('only calls setUserId once per session', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          userId: 'user.id',
        },
        mapping: mapping.config,
      });

      // First event with user
      await elb(
        getEvent('page view', {
          user: { id: 'user-123' },
        }),
      );

      // Second event with different user
      await elb(
        getEvent('page view', {
          user: { id: 'user-456' },
        }),
      );

      // Should only have one setUserId call
      const setUserIdCalls = calls.filter((c) => c.args[0] === 'setUserId');
      expect(setUserIdCalls).toHaveLength(1);
      expect(setUserIdCalls[0].args[1]).toBe('user-123');
    });

    test('does not call setUserId when value is not available', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          userId: 'user.id',
        },
        mapping: mapping.config,
      });

      // Event without user.id (explicitly set user to empty object)
      await elb(
        getEvent('page view', {
          user: {} as WalkerOS.User,
        }),
      );

      const setUserIdCalls = calls.filter((c) => c.args[0] === 'setUserId');
      expect(setUserIdCalls).toHaveLength(0);
    });

    test('sets userId on first event where value becomes available', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          userId: 'user.id',
        },
        mapping: mapping.config,
      });

      // First event - no user.id
      await elb(
        getEvent('page view', {
          user: {} as WalkerOS.User,
        }),
      );

      // Second event - user available
      await elb(
        getEvent('page view', {
          user: { id: 'user-123' },
        }),
      );

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['setUserId', 'user-123'],
      });
    });

    test('does not call setUserId when not configured', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          // No userId setting
        },
        mapping: mapping.config,
      });

      await elb(
        getEvent('page view', {
          user: { id: 'user-123' },
        }),
      );

      const setUserIdCalls = calls.filter((c) => c.args[0] === 'setUserId');
      expect(setUserIdCalls).toHaveLength(0);
    });
  });

  describe('globalContexts', () => {
    test('adds static global context', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          globalContexts: [
            {
              schema: 'iglu:com.example/app_info/jsonschema/1-0-0',
              data: { version: '1.0.0', environment: 'production' },
            },
          ],
        },
      });

      await elb(getEvent());

      const addContextsCall = calls.find(
        (c) => c.args[0] === 'addGlobalContexts',
      );
      expect(addContextsCall).toBeDefined();
      expect(addContextsCall?.args[1]).toContainEqual({
        schema: 'iglu:com.example/app_info/jsonschema/1-0-0',
        data: { version: '1.0.0', environment: 'production' },
      });
    });

    test('adds function-based global context', async () => {
      const contextGenerator = jest.fn(() => ({
        schema: 'iglu:com.example/consent/jsonschema/1-0-0',
        data: { advertising: true },
      }));

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          globalContexts: [contextGenerator],
        },
      });

      await elb(getEvent());

      const addContextsCall = calls.find(
        (c) => c.args[0] === 'addGlobalContexts',
      );
      expect(addContextsCall).toBeDefined();
      // The function itself should be passed to Snowplow
      expect(addContextsCall?.args[1]).toContainEqual(contextGenerator);
    });

    test('no global contexts call when not configured', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
      });

      await elb(getEvent());

      const addContextsCall = calls.find(
        (c) => c.args[0] === 'addGlobalContexts',
      );
      expect(addContextsCall).toBeUndefined();
    });
  });

  describe('utility functions', () => {
    test('clearUserData calls snowplow clearUserData', () => {
      clearUserData(testEnv as DestinationSnowplow.Env);

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['clearUserData'],
      });
    });

    test('enableAnonymousTracking calls snowplow enableAnonymousTracking', () => {
      enableAnonymousTracking(undefined, testEnv as DestinationSnowplow.Env);

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['enableAnonymousTracking'],
      });
    });

    test('enableAnonymousTracking with options', () => {
      enableAnonymousTracking(
        { withServerAnonymisation: true, withSessionTracking: true },
        testEnv as DestinationSnowplow.Env,
      );

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: [
          'enableAnonymousTracking',
          { withServerAnonymisation: true, withSessionTracking: true },
        ],
      });
    });

    test('disableAnonymousTracking calls snowplow disableAnonymousTracking', () => {
      disableAnonymousTracking(undefined, testEnv as DestinationSnowplow.Env);

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: ['disableAnonymousTracking'],
      });
    });

    test('disableAnonymousTracking with storage strategy', () => {
      disableAnonymousTracking(
        'cookieAndLocalStorage',
        testEnv as DestinationSnowplow.Env,
      );

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: [
          'disableAnonymousTracking',
          { stateStorageStrategy: 'cookieAndLocalStorage' },
        ],
      });
    });
  });
});
