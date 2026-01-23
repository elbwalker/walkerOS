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
  SCHEMAS,
  WEB_SCHEMAS,
  MEDIA_SCHEMAS,
  MEDIA_ACTIONS,
} from '.';
import { resetLoadedScripts, DEFAULT_SCRIPT_URL } from './setup';

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

  describe('loadScript with scriptUrl', () => {
    let createdScripts: Array<{ src: string }>;

    beforeEach(() => {
      createdScripts = [];
      resetLoadedScripts();
    });

    test('uses custom scriptUrl when provided', async () => {
      const customScriptUrl =
        'https://cdn.jsdelivr.net/npm/@snowplow/javascript-tracker@3.24.0/dist/sp.js';

      // Create env that captures created scripts
      const scriptEnv = {
        window: {
          snowplow: Object.assign(() => {}, { q: [] }),
        },
        document: {
          createElement: () => {
            const element = { src: '', async: false };
            createdScripts.push(element);
            return element;
          },
          head: {
            appendChild: () => {},
          },
        },
      };

      const destinationWithEnv = {
        ...destination,
        env: scriptEnv as unknown as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        loadScript: true,
        settings: {
          collectorUrl: 'https://collector.example.com',
          scriptUrl: customScriptUrl,
        },
      });

      await elb(getEvent());

      expect(createdScripts.length).toBeGreaterThan(0);
      expect(createdScripts[0].src).toBe(customScriptUrl);
    });

    test('uses default CDN URL when scriptUrl not provided', async () => {
      // Create env that captures created scripts
      const scriptEnv = {
        window: {
          snowplow: Object.assign(() => {}, { q: [] }),
        },
        document: {
          createElement: () => {
            const element = { src: '', async: false };
            createdScripts.push(element);
            return element;
          },
          head: {
            appendChild: () => {},
          },
        },
      };

      const destinationWithEnv = {
        ...destination,
        env: scriptEnv as unknown as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        loadScript: true,
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
      });

      await elb(getEvent());

      expect(createdScripts.length).toBeGreaterThan(0);
      expect(createdScripts[0].src).toBe(DEFAULT_SCRIPT_URL);
    });
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
        pageViewEvent: 'page view',
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

  // setPageType is from @snowplow/browser-plugin-snowplow-ecommerce
  // Must import the plugin and add setPageType to tracker functions
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
          pageViewEvent: 'page view',
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

  describe('page view configuration', () => {
    test('trackPageView calls trackPageView on init', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          trackPageView: true,
        },
      });

      // Wait for init to complete
      await elb(getEvent('product view', { id: '123' }));

      // Verify trackPageView was called during init
      const pageViewCall = calls.find((c) => c.args[0] === 'trackPageView');
      expect(pageViewCall).toBeDefined();
    });

    test('custom pageViewEvent triggers trackPageView', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          pageViewEvent: 'screen view',
        },
      });

      await elb('screen view', {});

      const pageViewCall = calls.find((c) => c.args[0] === 'trackPageView');
      expect(pageViewCall).toBeDefined();
    });

    test('no trackPageView without explicit pageViewEvent', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          // No pageViewEvent specified - should NOT call trackPageView
        },
      });

      await elb('page view', {});

      const pageViewCall = calls.find((c) => c.args[0] === 'trackPageView');
      expect(pageViewCall).toBeUndefined();
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

  describe('browser context', () => {
    test('enables browser context when configured', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          contexts: {
            browser: true,
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
          browser: true,
        },
      });
    });

    test('combines multiple context options', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          contexts: {
            webPage: true,
            session: true,
            browser: true,
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
          webPage: true,
          session: true,
          browser: true,
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

  describe('instance-scoped state (SSR-safe)', () => {
    test('separate destination instances have independent userIdSet state', async () => {
      const destination1 = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      const destination2 = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };

      const { elb: elb1 } = await startFlow({
        destinations: {
          sp1: {
            code: destination1,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                userId: 'user.id',
              },
              mapping: mapping.config,
            },
          },
        },
      });

      const { elb: elb2 } = await startFlow({
        destinations: {
          sp2: {
            code: destination2,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                userId: 'user.id',
              },
              mapping: mapping.config,
            },
          },
        },
      });

      await elb1(getEvent('page view', { user: { id: 'user-A' } }));
      await elb2(getEvent('page view', { user: { id: 'user-B' } }));

      const setUserIdCalls = calls.filter((c) => c.args[0] === 'setUserId');
      expect(setUserIdCalls).toHaveLength(2);
      expect(setUserIdCalls[0].args[1]).toBe('user-A');
      expect(setUserIdCalls[1].args[1]).toBe('user-B');
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

  describe('context loop expansion', () => {
    test('context with loop creates multiple entities', async () => {
      const event = {
        ...getEvent('order complete'),
        nested: [
          { type: 'product', data: { id: 'P1', name: 'Laptop', price: 999 } },
          { type: 'product', data: { id: 'P2', name: 'Mouse', price: 49 } },
        ],
      };

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          order: {
            complete: {
              name: 'transaction',
              settings: {
                context: [
                  {
                    schema:
                      'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
                    data: {
                      loop: [
                        'nested',
                        {
                          map: {
                            id: 'data.id',
                            name: 'data.name',
                            price: 'data.price',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      });

      await elb(event);

      const trackCall = calls.find(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as { context?: unknown[] };
      expect(selfDescribingEvent.context).toHaveLength(2);
      expect(selfDescribingEvent.context).toContainEqual({
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
        data: { id: 'P1', name: 'Laptop', price: 999 },
      });
      expect(selfDescribingEvent.context).toContainEqual({
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
        data: { id: 'P2', name: 'Mouse', price: 49 },
      });
    });

    test('context with mixed loop and non-loop entities', async () => {
      const event = {
        ...getEvent('order complete'),
        data: {
          id: 'ORD-123',
          total: 1048,
          currency: 'USD',
        },
        nested: [
          { type: 'product', data: { id: 'P1', name: 'Laptop', price: 999 } },
          { type: 'product', data: { id: 'P2', name: 'Mouse', price: 49 } },
        ],
      };

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          order: {
            complete: {
              name: 'transaction',
              settings: {
                context: [
                  // Non-loop: single transaction entity
                  {
                    schema:
                      'iglu:com.snowplowanalytics.snowplow.ecommerce/transaction/jsonschema/1-0-0',
                    data: {
                      transaction_id: 'data.id',
                      revenue: 'data.total',
                      currency: 'data.currency',
                    },
                  },
                  // Loop: multiple product entities
                  {
                    schema:
                      'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
                    data: {
                      loop: [
                        'nested',
                        {
                          map: {
                            id: 'data.id',
                            name: 'data.name',
                            price: 'data.price',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      });

      await elb(event);

      const trackCall = calls.find(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as { context?: unknown[] };
      // 1 transaction + 2 products = 3 context entities
      expect(selfDescribingEvent.context).toHaveLength(3);

      // Verify transaction entity
      expect(selfDescribingEvent.context).toContainEqual({
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/transaction/jsonschema/1-0-0',
        data: { transaction_id: 'ORD-123', revenue: 1048, currency: 'USD' },
      });

      // Verify product entities
      expect(selfDescribingEvent.context).toContainEqual({
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
        data: { id: 'P1', name: 'Laptop', price: 999 },
      });
      expect(selfDescribingEvent.context).toContainEqual({
        schema:
          'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
        data: { id: 'P2', name: 'Mouse', price: 49 },
      });
    });

    test('context loop with empty source array creates no entities', async () => {
      const event = {
        ...getEvent('order complete'),
        nested: [], // Empty array
      };

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          order: {
            complete: {
              name: 'transaction',
              settings: {
                context: [
                  {
                    schema:
                      'iglu:com.snowplowanalytics.snowplow.ecommerce/product/jsonschema/1-0-0',
                    data: {
                      loop: ['nested', { map: { id: 'data.id' } }],
                    },
                  },
                ],
              },
            },
          },
        },
      });

      await elb(event);

      const trackCall = calls.find(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as { context?: unknown[] };
      // No context when source array is empty
      expect(selfDescribingEvent.context).toBeUndefined();
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

  describe('WEB_SCHEMAS', () => {
    test('exports web event schemas', () => {
      expect(WEB_SCHEMAS.LINK_CLICK).toBe(
        'iglu:com.snowplowanalytics.snowplow/link_click/jsonschema/1-0-1',
      );
      expect(WEB_SCHEMAS.SUBMIT_FORM).toBe(
        'iglu:com.snowplowanalytics.snowplow/submit_form/jsonschema/1-0-0',
      );
      expect(WEB_SCHEMAS.SITE_SEARCH).toBe(
        'iglu:com.snowplowanalytics.snowplow/site_search/jsonschema/1-0-0',
      );
      expect(WEB_SCHEMAS.TIMING).toBe(
        'iglu:com.snowplowanalytics.snowplow/timing/jsonschema/1-0-0',
      );
      expect(WEB_SCHEMAS.WEB_VITALS).toBe(
        'iglu:com.snowplowanalytics.snowplow/web_vitals/jsonschema/1-0-0',
      );
    });

    test('exports web context schemas', () => {
      expect(WEB_SCHEMAS.WEB_PAGE).toBe(
        'iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0',
      );
      expect(WEB_SCHEMAS.BROWSER).toBe(
        'iglu:com.snowplowanalytics.snowplow/browser_context/jsonschema/2-0-0',
      );
      expect(WEB_SCHEMAS.CLIENT_SESSION).toBe(
        'iglu:com.snowplowanalytics.snowplow/client_session/jsonschema/1-0-2',
      );
      expect(WEB_SCHEMAS.GEOLOCATION).toBe(
        'iglu:com.snowplowanalytics.snowplow/geolocation_context/jsonschema/1-1-0',
      );
    });
  });

  describe('MEDIA_SCHEMAS', () => {
    test('exports media event schemas', () => {
      expect(MEDIA_SCHEMAS.PLAY).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/play_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.PAUSE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/pause_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.END).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/end_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.READY).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ready_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.SEEK_START).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/seek_start_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.SEEK_END).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/seek_end_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.BUFFER_START).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/buffer_start_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.BUFFER_END).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/buffer_end_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.QUALITY_CHANGE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/quality_change_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.FULLSCREEN_CHANGE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/fullscreen_change_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.VOLUME_CHANGE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/volume_change_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.PLAYBACK_RATE_CHANGE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/playback_rate_change_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.PIP_CHANGE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/picture_in_picture_change_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.PING).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ping_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.PERCENT_PROGRESS).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/percent_progress_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.ERROR).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/error_event/jsonschema/1-0-0',
      );
    });

    test('exports ad event schemas', () => {
      expect(MEDIA_SCHEMAS.AD_BREAK_START).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_break_start_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_BREAK_END).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_break_end_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_START).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_start_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_COMPLETE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_complete_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_SKIP).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_skip_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_CLICK).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_click_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_PAUSE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_pause_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_RESUME).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_resume_event/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_QUARTILE).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_quartile_event/jsonschema/1-0-0',
      );
    });

    test('exports media context schemas', () => {
      expect(MEDIA_SCHEMAS.MEDIA_PLAYER).toBe(
        'iglu:com.snowplowanalytics.snowplow/media_player/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.SESSION).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/session/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad/jsonschema/1-0-0',
      );
      expect(MEDIA_SCHEMAS.AD_BREAK).toBe(
        'iglu:com.snowplowanalytics.snowplow.media/ad_break/jsonschema/1-0-0',
      );
    });
  });

  describe('MEDIA_ACTIONS', () => {
    test('exports media action types', () => {
      expect(MEDIA_ACTIONS.PLAY).toBe('play');
      expect(MEDIA_ACTIONS.PAUSE).toBe('pause');
      expect(MEDIA_ACTIONS.END).toBe('end');
      expect(MEDIA_ACTIONS.READY).toBe('ready');
      expect(MEDIA_ACTIONS.SEEK_START).toBe('seek_start');
      expect(MEDIA_ACTIONS.SEEK_END).toBe('seek_end');
      expect(MEDIA_ACTIONS.BUFFER_START).toBe('buffer_start');
      expect(MEDIA_ACTIONS.BUFFER_END).toBe('buffer_end');
      expect(MEDIA_ACTIONS.QUALITY_CHANGE).toBe('quality_change');
      expect(MEDIA_ACTIONS.FULLSCREEN_CHANGE).toBe('fullscreen_change');
      expect(MEDIA_ACTIONS.VOLUME_CHANGE).toBe('volume_change');
      expect(MEDIA_ACTIONS.PLAYBACK_RATE_CHANGE).toBe('playback_rate_change');
      expect(MEDIA_ACTIONS.PIP_CHANGE).toBe('pip_change');
      expect(MEDIA_ACTIONS.PING).toBe('ping');
      expect(MEDIA_ACTIONS.PERCENT_PROGRESS).toBe('percent_progress');
      expect(MEDIA_ACTIONS.ERROR).toBe('error');
    });

    test('exports ad action types', () => {
      expect(MEDIA_ACTIONS.AD_BREAK_START).toBe('ad_break_start');
      expect(MEDIA_ACTIONS.AD_BREAK_END).toBe('ad_break_end');
      expect(MEDIA_ACTIONS.AD_START).toBe('ad_start');
      expect(MEDIA_ACTIONS.AD_COMPLETE).toBe('ad_complete');
      expect(MEDIA_ACTIONS.AD_SKIP).toBe('ad_skip');
      expect(MEDIA_ACTIONS.AD_CLICK).toBe('ad_click');
      expect(MEDIA_ACTIONS.AD_PAUSE).toBe('ad_pause');
      expect(MEDIA_ACTIONS.AD_RESUME).toBe('ad_resume');
      expect(MEDIA_ACTIONS.AD_QUARTILE).toBe('ad_quartile');
    });
  });

  describe('trackStructEvent', () => {
    test('calls trackStructEvent when struct mapping is present', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: { value: 'click' },
                },
              },
            },
          },
        },
      });

      await elb('button click', { button_name: 'submit' });

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: [
          'trackStructEvent',
          {
            category: 'ui',
            action: 'click',
          },
        ],
      });
    });

    test('includes optional label, property, and value', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: { value: 'click' },
                  label: 'data.button_name',
                  property: 'data.section',
                  value: 'data.position',
                },
              },
            },
          },
        },
      });

      await elb('button click', {
        button_name: 'submit',
        section: 'header',
        position: 3,
      });

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: [
          'trackStructEvent',
          {
            category: 'ui',
            action: 'click',
            label: 'submit',
            property: 'header',
            value: 3,
          },
        ],
      });
    });

    test('converts string value to number', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: { value: 'click' },
                  value: 'data.count',
                },
              },
            },
          },
        },
      });

      await elb('button click', { count: '42' });

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: [
          'trackStructEvent',
          {
            category: 'ui',
            action: 'click',
            value: 42,
          },
        ],
      });
    });

    test('skips event when category is missing', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: 'data.category', // Will be undefined
                  action: { value: 'click' },
                },
              },
            },
          },
        },
      });

      await elb('button click', { button_name: 'submit' });

      // Should only have newTracker call, no trackStructEvent
      const structEventCalls = calls.filter(
        (c) => c.args[0] === 'trackStructEvent',
      );
      expect(structEventCalls).toHaveLength(0);
    });

    test('skips event when action is missing', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: 'data.action', // Will be undefined
                },
              },
            },
          },
        },
      });

      await elb('button click', { button_name: 'submit' });

      // Should only have newTracker call, no trackStructEvent
      const structEventCalls = calls.filter(
        (c) => c.args[0] === 'trackStructEvent',
      );
      expect(structEventCalls).toHaveLength(0);
    });

    test('does not call trackSelfDescribingEvent when struct is used', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              name: 'product_view', // Would trigger self-describing if struct wasn't present
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: { value: 'click' },
                },
              },
            },
          },
        },
      });

      await elb('button click', { button_name: 'submit' });

      // Should have trackStructEvent, NOT trackSelfDescribingEvent
      const selfDescCalls = calls.filter(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      const structCalls = calls.filter((c) => c.args[0] === 'trackStructEvent');

      expect(selfDescCalls).toHaveLength(0);
      expect(structCalls).toHaveLength(1);
    });

    test('uses dynamic category and action from event data', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          interaction: {
            track: {
              settings: {
                struct: {
                  category: 'data.event_category',
                  action: 'data.event_action',
                },
              },
            },
          },
        },
      });

      await elb('interaction track', {
        event_category: 'navigation',
        event_action: 'menu_open',
      });

      expect(calls).toContainEqual({
        path: ['window', 'snowplow'],
        args: [
          'trackStructEvent',
          {
            category: 'navigation',
            action: 'menu_open',
          },
        ],
      });
    });
  });

  describe('logging warnings', () => {
    test('logs warning when struct category is missing', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: 'data.category', // Will be undefined
                  action: { value: 'click' },
                },
              },
            },
          },
        },
      });

      calls = [];
      await elb('button click'); // No data.category

      // No trackStructEvent call should be made
      const structCalls = calls.filter(
        (c) =>
          c.path.join('.') === 'window.snowplow' &&
          c.args[0] === 'trackStructEvent',
      );
      expect(structCalls).toHaveLength(0);
    });

    test('logs warning when struct category is not a string', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: 'data.category', // Will be a number
                  action: { value: 'click' },
                },
              },
            },
          },
        },
      });

      calls = [];
      await elb('button click', { category: 123 });

      // No trackStructEvent call should be made
      const structCalls = calls.filter(
        (c) =>
          c.path.join('.') === 'window.snowplow' &&
          c.args[0] === 'trackStructEvent',
      );
      expect(structCalls).toHaveLength(0);
    });

    test('logs warning when struct action is missing', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: 'data.action', // Will be undefined
                },
              },
            },
          },
        },
      });

      calls = [];
      await elb('button click'); // No data.action

      // No trackStructEvent call should be made
      const structCalls = calls.filter(
        (c) =>
          c.path.join('.') === 'window.snowplow' &&
          c.args[0] === 'trackStructEvent',
      );
      expect(structCalls).toHaveLength(0);
    });

    test('logs warning when struct action is not a string', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: 'data.action', // Will be an object
                },
              },
            },
          },
        },
      });

      calls = [];
      await elb('button click', { action: { nested: true } });

      // No trackStructEvent call should be made
      const structCalls = calls.filter(
        (c) =>
          c.path.join('.') === 'window.snowplow' &&
          c.args[0] === 'trackStructEvent',
      );
      expect(structCalls).toHaveLength(0);
    });

    test('logs warning when event has mapping but no action name', async () => {
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
              // Has context but no name - should skip
              settings: {
                context: [
                  {
                    schema: 'iglu:com.example/context/jsonschema/1-0-0',
                    data: { id: 'data.id' },
                  },
                ],
              },
            },
          },
        },
      });

      calls = [];
      await elb('custom event', { id: '123' });

      // No trackSelfDescribingEvent call should be made
      const trackCalls = calls.filter(
        (c) =>
          c.path.join('.') === 'window.snowplow' &&
          c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCalls).toHaveLength(0);
    });

    test('throws when tracker not initialized during push', async () => {
      // Create a destination without initializing the tracker
      const uninitializedEnv = {
        window: { snowplow: undefined },
        document: {},
      };

      const uninitializedDestination = {
        ...destination,
        env: uninitializedEnv as DestinationSnowplow.Env,
      };

      // Try to add destination - init should fail
      elb('walker destination', uninitializedDestination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
      });

      // Events should be skipped since tracker is not initialized
      // (init returns false when snowplow is not available)
    });
  });

  describe('context building edge cases', () => {
    test('skips context entries without schema', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          product: {
            view: {
              name: 'product_view',
              settings: {
                context: [
                  // Entry without schema - should be skipped
                  { data: { id: 'data.id' } } as unknown as {
                    schema: string;
                    data: unknown;
                  },
                  // Valid entry - should be included
                  {
                    schema: 'iglu:com.example/product/jsonschema/1-0-0',
                    data: { name: { value: 'Test Product' } },
                  },
                ],
              },
            },
          },
        },
      });

      calls = [];
      await elb('product view', { id: 'P123' });

      const trackCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' &&
          c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as { context?: unknown[] };
      // Only valid context should be included
      expect(selfDescribingEvent.context).toHaveLength(1);
      expect(selfDescribingEvent.context?.[0]).toMatchObject({
        schema: 'iglu:com.example/product/jsonschema/1-0-0',
      });
    });

    test('skips non-object context entries', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          product: {
            view: {
              name: 'product_view',
              settings: {
                context: [
                  // Non-object entries - should be skipped
                  null as unknown as { schema: string; data: unknown },
                  'string entry' as unknown as {
                    schema: string;
                    data: unknown;
                  },
                  123 as unknown as { schema: string; data: unknown },
                  // Valid entry - should be included
                  {
                    schema: 'iglu:com.example/product/jsonschema/1-0-0',
                    data: { name: { value: 'Test Product' } },
                  },
                ],
              },
            },
          },
        },
      });

      calls = [];
      await elb('product view', { id: 'P123' });

      const trackCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' &&
          c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as { context?: unknown[] };
      // Only valid context should be included
      expect(selfDescribingEvent.context).toHaveLength(1);
      expect(selfDescribingEvent.context?.[0]).toMatchObject({
        schema: 'iglu:com.example/product/jsonschema/1-0-0',
      });
    });
  });

  describe('consent tracking (on handler)', () => {
    test('calls trackConsentAllow when all required scopes granted', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };

      const { elb: flowElb } = await startFlow({
        destinations: {
          snowplow: {
            code: destinationWithEnv,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                consent: {
                  required: ['analytics', 'marketing'],
                  basisForProcessing: 'consent',
                  consentUrl: 'https://example.com/privacy',
                  consentVersion: '2.0',
                },
              },
            },
          },
        },
      });

      // Initialize destination first (triggers init)
      await flowElb('page view');

      // Grant all required consent
      await flowElb('walker consent', { analytics: true, marketing: true });

      const consentCall = calls.find((c) => c.args[0] === 'trackConsentAllow');
      expect(consentCall).toBeDefined();
      expect(consentCall?.args[1]).toMatchObject({
        basisForProcessing: 'consent',
        consentScopes: ['analytics', 'marketing'],
        consentUrl: 'https://example.com/privacy',
        consentVersion: '2.0',
      });
    });

    test('calls trackConsentDeny when all required scopes denied', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };

      const { elb: flowElb } = await startFlow({
        destinations: {
          snowplow: {
            code: destinationWithEnv,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                consent: {
                  required: ['analytics', 'marketing'],
                  basisForProcessing: 'consent',
                },
              },
            },
          },
        },
      });

      // Initialize destination first
      await flowElb('page view');

      // Deny all consent
      await flowElb('walker consent', { analytics: false, marketing: false });

      const consentCall = calls.find((c) => c.args[0] === 'trackConsentDeny');
      expect(consentCall).toBeDefined();
      expect(consentCall?.args[1]).toMatchObject({
        basisForProcessing: 'consent',
        consentScopes: ['analytics', 'marketing'], // Deny includes the scopes being denied
      });
    });

    test('calls trackConsentSelected when partial consent granted', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };

      const { elb: flowElb } = await startFlow({
        destinations: {
          snowplow: {
            code: destinationWithEnv,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                consent: {
                  required: ['analytics', 'marketing'],
                  basisForProcessing: 'consent',
                },
              },
            },
          },
        },
      });

      // Initialize destination first
      await flowElb('page view');

      // Partial consent
      await flowElb('walker consent', { analytics: true, marketing: false });

      const consentCall = calls.find(
        (c) => c.args[0] === 'trackConsentSelected',
      );
      expect(consentCall).toBeDefined();
      expect(consentCall?.args[1]).toMatchObject({
        basisForProcessing: 'consent',
        consentScopes: ['analytics'],
      });
    });

    test('skips consent tracking when consent config not set', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };

      const { elb: flowElb } = await startFlow({
        destinations: {
          snowplow: {
            code: destinationWithEnv,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                // No consent config
              },
            },
          },
        },
      });

      // Initialize destination first
      await flowElb('page view');

      // Grant consent
      await flowElb('walker consent', { analytics: true });

      // Should not have any consent tracking calls
      const consentCalls = calls.filter(
        (c) =>
          c.args[0] === 'trackConsentAllow' ||
          c.args[0] === 'trackConsentDeny' ||
          c.args[0] === 'trackConsentSelected',
      );
      expect(consentCalls).toHaveLength(0);
    });

    test('uses all consent keys when required not specified', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };

      const { elb: flowElb } = await startFlow({
        destinations: {
          snowplow: {
            code: destinationWithEnv,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                consent: {
                  // No required specified - should use all consent keys from event
                  basisForProcessing: 'legitimate_interests',
                },
              },
            },
          },
        },
      });

      // Initialize destination first
      await flowElb('page view');

      // Grant some consent
      await flowElb('walker consent', {
        necessary: true,
        analytics: true,
        marketing: false,
      });

      const consentCall = calls.find(
        (c) => c.args[0] === 'trackConsentSelected',
      );
      expect(consentCall).toBeDefined();
      expect(consentCall?.args[1]).toMatchObject({
        basisForProcessing: 'legitimate_interests',
        consentScopes: expect.arrayContaining(['necessary', 'analytics']),
      });
      // marketing should not be in scopes since it's false
      expect(consentCall?.args[1].consentScopes).not.toContain('marketing');
    });

    test('includes optional gdprApplies and domainsApplied', async () => {
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };

      const { elb: flowElb } = await startFlow({
        destinations: {
          snowplow: {
            code: destinationWithEnv,
            config: {
              settings: {
                collectorUrl: 'https://collector.example.com',
                consent: {
                  required: ['analytics'],
                  basisForProcessing: 'consent',
                  gdprApplies: true,
                  domainsApplied: ['example.com', 'shop.example.com'],
                },
              },
            },
          },
        },
      });

      // Initialize destination first
      await flowElb('page view');

      // Grant consent
      await flowElb('walker consent', { analytics: true });

      const consentCall = calls.find((c) => c.args[0] === 'trackConsentAllow');
      expect(consentCall).toBeDefined();
      expect(consentCall?.args[1]).toMatchObject({
        gdprApplies: true,
        domainsApplied: ['example.com', 'shop.example.com'],
      });
    });
  });

  describe('code-based plugins (plugin.code)', () => {
    test('uses plugin code directly when provided as object', async () => {
      const mockPlugin = { trackerId: 'test' };

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          plugins: [{ code: mockPlugin }],
        },
      });

      await elb(getEvent());

      // Find addPlugin call
      const addPluginCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'addPlugin',
      );
      expect(addPluginCall).toBeDefined();
      expect(addPluginCall!.args[1]).toEqual({ plugin: mockPlugin });
    });

    test('calls plugin factory with config when provided', async () => {
      const mockPluginInstance = { trackerId: 'configured' };
      const mockPluginFactory = jest.fn().mockReturnValue(mockPluginInstance);

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          plugins: [{ code: mockPluginFactory, config: { option: true } }],
        },
      });

      await elb(getEvent());

      // Factory should be called with config
      expect(mockPluginFactory).toHaveBeenCalledWith({ option: true });

      // Plugin should be added with the returned instance
      const addPluginCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'addPlugin',
      );
      expect(addPluginCall).toBeDefined();
      expect(addPluginCall!.args[1]).toEqual({ plugin: mockPluginInstance });
    });

    test('uses factory directly when no config provided', async () => {
      // When a function is provided without config, it should be used as-is (not called)
      const mockPluginFunction = jest.fn();

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          plugins: [{ code: mockPluginFunction }], // No config
        },
      });

      await elb(getEvent());

      // Factory should NOT be called (no config to pass)
      expect(mockPluginFunction).not.toHaveBeenCalled();

      // Plugin should be added with the function itself
      const addPluginCall = calls.find(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'addPlugin',
      );
      expect(addPluginCall).toBeDefined();
      expect(addPluginCall!.args[1]).toEqual({ plugin: mockPluginFunction });
    });

    test('handles multiple code-based plugins', async () => {
      const mockPlugin1 = { trackerId: 'plugin1' };
      const mockPlugin2 = { trackerId: 'plugin2' };

      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          plugins: [{ code: mockPlugin1 }, { code: mockPlugin2 }],
        },
      });

      await elb(getEvent());

      // Find all addPlugin calls
      const addPluginCalls = calls.filter(
        (c) =>
          c.path.join('.') === 'window.snowplow' && c.args[0] === 'addPlugin',
      );
      expect(addPluginCalls).toHaveLength(2);
      expect(addPluginCalls[0].args[1]).toEqual({ plugin: mockPlugin1 });
      expect(addPluginCalls[1].args[1]).toEqual({ plugin: mockPlugin2 });
    });
  });

  describe('self-describing event data patterns', () => {
    test('media marker events send empty data {}', async () => {
      // Media events like play/pause use schemas that expect empty data
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          video: {
            play: {
              name: 'play', // actionName
              settings: {
                snowplow: {
                  actionSchema: MEDIA_SCHEMAS.PLAY,
                },
              },
            },
          },
        },
      });

      await elb('video play', { videoId: 'abc123' });

      const trackCall = calls.find(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as {
        event: { schema: string; data: unknown };
      };
      expect(selfDescribingEvent.event.schema).toBe(MEDIA_SCHEMAS.PLAY);
      // Marker events should have empty data object
      expect(selfDescribingEvent.event.data).toEqual({});
    });

    test('ecommerce events send {type: actionName}', async () => {
      // Ecommerce pattern uses SCHEMAS.ACTION with type field
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          product: {
            view: {
              name: 'product_view', // actionName becomes type
              settings: {
                snowplow: {
                  actionSchema: SCHEMAS.ACTION, // Explicit ecommerce schema
                },
              },
            },
          },
        },
      });

      await elb('product view', { id: 'prod-123' });

      const trackCall = calls.find(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as {
        event: { schema: string; data: unknown };
      };
      expect(selfDescribingEvent.event.schema).toBe(SCHEMAS.ACTION);
      // Ecommerce events should have type field
      expect(selfDescribingEvent.event.data).toEqual({ type: 'product_view' });
    });

    test('events with mapping.data.map use mapped data', async () => {
      // Events with data.map use the mapped values instead
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          video: {
            progress: {
              name: 'percent_progress',
              settings: {
                // data.map is checked by push.ts to build event data
                data: {
                  map: {
                    percentProgress: 'data.progress',
                  },
                },
                snowplow: {
                  actionSchema: MEDIA_SCHEMAS.PERCENT_PROGRESS,
                },
              },
            },
          },
        },
      });

      await elb('video progress', { progress: 25 });

      const trackCall = calls.find(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as {
        event: { schema: string; data: unknown };
      };
      expect(selfDescribingEvent.event.schema).toBe(
        MEDIA_SCHEMAS.PERCENT_PROGRESS,
      );
      // Mapped data should be used
      expect(selfDescribingEvent.event.data).toEqual({ percentProgress: 25 });
    });

    test('default actionSchema uses ecommerce pattern', async () => {
      // When no actionSchema specified, default SCHEMAS.ACTION is used
      const destinationWithEnv = {
        ...destination,
        env: testEnv as DestinationSnowplow.Env,
      };
      elb('walker destination', destinationWithEnv, {
        settings: {
          collectorUrl: 'https://collector.example.com',
        },
        mapping: {
          product: {
            click: {
              name: 'list_click', // actionName
              // No actionSchema - should default to SCHEMAS.ACTION
            },
          },
        },
      });

      await elb('product click', { id: 'prod-456' });

      const trackCall = calls.find(
        (c) => c.args[0] === 'trackSelfDescribingEvent',
      );
      expect(trackCall).toBeDefined();

      const selfDescribingEvent = trackCall?.args[1] as {
        event: { schema: string; data: unknown };
      };
      expect(selfDescribingEvent.event.schema).toBe(SCHEMAS.ACTION);
      expect(selfDescribingEvent.event.data).toEqual({ type: 'list_click' });
    });
  });

  describe('browser-tracker mode (TrackerFunctions)', () => {
    let mockNewTracker: jest.Mock;
    let mockTrackSelfDescribingEvent: jest.Mock;
    let mockTrackPageView: jest.Mock;
    let mockTrackStructEvent: jest.Mock;
    let mockEnableActivityTracking: jest.Mock;
    let mockAddPlugin: jest.Mock;
    let mockAddGlobalContexts: jest.Mock;
    let mockSetUserId: jest.Mock;

    beforeEach(() => {
      mockNewTracker = jest.fn();
      mockTrackSelfDescribingEvent = jest.fn();
      mockTrackPageView = jest.fn();
      mockTrackStructEvent = jest.fn();
      mockEnableActivityTracking = jest.fn();
      mockAddPlugin = jest.fn();
      mockAddGlobalContexts = jest.fn();
      mockSetUserId = jest.fn();
    });

    test('initializes tracker with TrackerFunctions', async () => {
      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          appId: 'test-app',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
          },
        },
      });

      await elb(getEvent());

      expect(mockNewTracker).toHaveBeenCalledWith(
        'sp',
        'https://collector.example.com',
        expect.objectContaining({
          appId: 'test-app',
        }),
      );
    });

    test('tracks events using adapter in browser-tracker mode', async () => {
      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
          },
        },
        mapping: {
          product: {
            view: {
              name: 'product_view',
            },
          },
        },
      });

      await elb('product view', { id: 'prod-123' });

      expect(mockTrackSelfDescribingEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            data: { type: 'product_view' },
          }),
        }),
      );
    });

    test('enables activity tracking via adapter', async () => {
      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            enableActivityTracking: mockEnableActivityTracking,
          },
          activityTracking: {
            minimumVisitLength: 10,
            heartbeatDelay: 30,
          },
        },
      });

      await elb(getEvent());

      expect(mockEnableActivityTracking).toHaveBeenCalledWith({
        minimumVisitLength: 10,
        heartbeatDelay: 30,
      });
    });

    test('adds code-based plugins via adapter', async () => {
      const mockPlugin = { name: 'TestPlugin' };

      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            addPlugin: mockAddPlugin,
          },
          plugins: [{ code: mockPlugin }],
        },
      });

      await elb(getEvent());

      expect(mockAddPlugin).toHaveBeenCalledWith({ plugin: mockPlugin });
    });

    test('adds global contexts via adapter', async () => {
      const globalContext = {
        schema: 'iglu:test/context/jsonschema/1-0-0',
        data: { key: 'value' },
      };

      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            addGlobalContexts: mockAddGlobalContexts,
          },
          globalContexts: [globalContext],
        },
      });

      await elb(getEvent());

      expect(mockAddGlobalContexts).toHaveBeenCalledWith([globalContext]);
    });

    test('sets userId via adapter', async () => {
      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            setUserId: mockSetUserId,
          },
          userId: 'user.id',
        },
        mapping: {
          product: {
            view: {
              name: 'product_view',
            },
          },
        },
      });

      await elb(
        getEvent('product view', {
          user: { id: 'u123' },
        }),
      );

      expect(mockSetUserId).toHaveBeenCalledWith('u123');
    });

    test('tracks page view via adapter when trackPageView is true', async () => {
      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            trackPageView: mockTrackPageView,
          },
          trackPageView: true,
        },
      });

      await elb(getEvent());

      expect(mockTrackPageView).toHaveBeenCalled();
    });

    test('tracks struct events via adapter', async () => {
      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            trackStructEvent: mockTrackStructEvent,
          },
        },
        mapping: {
          button: {
            click: {
              settings: {
                struct: {
                  category: { value: 'ui' },
                  action: { value: 'click' },
                },
              },
            },
          },
        },
      });

      await elb('button click', { button_name: 'submit' });

      expect(mockTrackStructEvent).toHaveBeenCalledWith({
        category: 'ui',
        action: 'click',
      });
    });

    test('logs error when newTracker is missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            // Missing newTracker - should fail
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
          },
        },
      });

      await elb(getEvent());

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[snowplow]'),
        'tracker.newTracker is required for browser-tracker mode',
      );
      consoleErrorSpy.mockRestore();
    });

    test('logs error when trackSelfDescribingEvent is missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            // Missing trackSelfDescribingEvent - should fail
          },
        },
      });

      await elb(getEvent());

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[snowplow]'),
        'tracker.trackSelfDescribingEvent is required for browser-tracker mode',
      );
      consoleErrorSpy.mockRestore();
    });

    test('gracefully handles missing optional functions', async () => {
      // Only provide required functions
      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            // No trackPageView, trackStructEvent, etc.
          },
          trackPageView: true, // Should silently skip if function not provided
        },
        mapping: {
          product: {
            view: {
              name: 'product_view',
            },
          },
        },
      });

      // Should not throw
      await elb('product view', { id: 'prod-123' });

      expect(mockTrackSelfDescribingEvent).toHaveBeenCalled();
    });

    test('handles plugin with factory function and config', async () => {
      const mockPluginFactory = jest
        .fn()
        .mockReturnValue({ name: 'ConfiguredPlugin' });

      elb('walker destination', destination, {
        settings: {
          collectorUrl: 'https://collector.example.com',
          tracker: {
            newTracker: mockNewTracker,
            trackSelfDescribingEvent: mockTrackSelfDescribingEvent,
            addPlugin: mockAddPlugin,
          },
          plugins: [
            {
              code: mockPluginFactory,
              config: { option: 'value' },
            },
          ],
        },
      });

      await elb(getEvent());

      expect(mockPluginFactory).toHaveBeenCalledWith({ option: 'value' });
      expect(mockAddPlugin).toHaveBeenCalledWith({
        plugin: { name: 'ConfiguredPlugin' },
      });
    });
  });
});
