import { applyOverrides } from '../apply-overrides';
import type { PushOverrides } from '../overrides';

describe('applyOverrides', () => {
  describe('destination overrides', () => {
    it('sets mock on a destination config', () => {
      const config: Record<string, unknown> = {
        destinations: {
          ga4: { config: {} },
        },
      };
      const overrides: PushOverrides = {
        destinations: {
          ga4: { config: { mock: { status: 200 } } },
        },
      };

      const { captured, trackingCalls } = applyOverrides(config, overrides);

      const dest = (config.destinations as Record<string, Record<string, unknown>>).ga4;
      expect((dest.config as Record<string, unknown>).mock).toEqual({ status: 200 });
      expect(captured).toEqual([]);
      expect(trackingCalls).toEqual([]);
    });

    it('sets disabled on a destination config', () => {
      const config: Record<string, unknown> = {
        destinations: {
          meta: { config: {} },
        },
      };
      const overrides: PushOverrides = {
        destinations: {
          meta: { config: { disabled: true } },
        },
      };

      applyOverrides(config, overrides);

      const dest = (config.destinations as Record<string, Record<string, unknown>>).meta;
      expect((dest.config as Record<string, unknown>).disabled).toBe(true);
    });

    it('creates config object if missing on destination', () => {
      const config: Record<string, unknown> = {
        destinations: {
          ga4: {},
        },
      };
      const overrides: PushOverrides = {
        destinations: {
          ga4: { config: { mock: {} } },
        },
      };

      applyOverrides(config, overrides);

      const dest = (config.destinations as Record<string, Record<string, unknown>>).ga4;
      expect((dest.config as Record<string, unknown>).mock).toEqual({});
    });

    it('skips destinations not present in config', () => {
      const config: Record<string, unknown> = {
        destinations: {
          ga4: { config: {} },
        },
      };
      const overrides: PushOverrides = {
        destinations: {
          nonexistent: { config: { mock: {} } },
        },
      };

      // Should not throw
      const { captured } = applyOverrides(config, overrides);
      expect(captured).toEqual([]);
    });

    it('handles missing destinations in config', () => {
      const config: Record<string, unknown> = {};
      const overrides: PushOverrides = {
        destinations: {
          ga4: { config: { mock: {} } },
        },
      };

      // Should not throw
      const { captured } = applyOverrides(config, overrides);
      expect(captured).toEqual([]);
    });

    it('sets env on destination config', () => {
      const config: Record<string, unknown> = {
        destinations: {
          ga4: { code: {}, config: {} },
        },
      };
      const overrides: PushOverrides = {
        destinations: {
          ga4: {
            config: { mock: {} },
            env: { window: { gtag: () => {} } },
          },
        },
      };

      applyOverrides(config, overrides);

      const dest = (config.destinations as Record<string, Record<string, unknown>>).ga4;
      expect((dest.config as Record<string, unknown>).env).toEqual({
        window: { gtag: expect.any(Function) },
      });
    });

    it('creates config object when setting env if missing', () => {
      const config: Record<string, unknown> = {
        destinations: {
          ga4: {},
        },
      };
      const overrides: PushOverrides = {
        destinations: {
          ga4: {
            env: { window: { gtag: () => {} } },
          },
        },
      };

      applyOverrides(config, overrides);

      const dest = (config.destinations as Record<string, Record<string, unknown>>).ga4;
      expect((dest.config as Record<string, unknown>).env).toEqual({
        window: { gtag: expect.any(Function) },
      });
    });
  });

  describe('source overrides', () => {
    it('replaces env.push with capturing wrapper when simulate is true', () => {
      const config: Record<string, unknown> = {
        sources: {
          express: { env: {} },
        },
      };
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
      };

      const { captured } = applyOverrides(config, overrides);

      // env.push should now be a function
      const source = (config.sources as Record<string, Record<string, unknown>>).express;
      const env = source.env as Record<string, unknown>;
      expect(typeof env.push).toBe('function');

      // Calling it should populate captured
      (env.push as (...args: unknown[]) => void)({ name: 'page view' });
      expect(captured).toHaveLength(1);
      expect(captured[0].event).toEqual({ name: 'page view' });
      expect(typeof captured[0].timestamp).toBe('number');
    });

    it('creates env object if missing on source', () => {
      const config: Record<string, unknown> = {
        sources: {
          express: {},
        },
      };
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
      };

      applyOverrides(config, overrides);

      const source = (config.sources as Record<string, Record<string, unknown>>).express;
      expect(source.env).toBeDefined();
      expect(typeof (source.env as Record<string, unknown>).push).toBe('function');
    });

    it('captured array populates with multiple events', () => {
      const config: Record<string, unknown> = {
        sources: {
          express: { env: {} },
        },
      };
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
      };

      const { captured } = applyOverrides(config, overrides);

      const env = ((config.sources as Record<string, Record<string, unknown>>).express.env) as Record<string, unknown>;
      const push = env.push as (...args: unknown[]) => void;

      push({ name: 'page view' });
      push({ name: 'product add' });
      push({ name: 'order complete' });

      expect(captured).toHaveLength(3);
      expect(captured[0].event).toEqual({ name: 'page view' });
      expect(captured[1].event).toEqual({ name: 'product add' });
      expect(captured[2].event).toEqual({ name: 'order complete' });
    });

    it('calls original push as passthrough', () => {
      const originalPush = jest.fn().mockReturnValue('original-result');
      const config: Record<string, unknown> = {
        sources: {
          express: { env: { push: originalPush } },
        },
      };
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
      };

      const { captured } = applyOverrides(config, overrides);

      const env = ((config.sources as Record<string, Record<string, unknown>>).express.env) as Record<string, unknown>;
      const push = env.push as (...args: unknown[]) => unknown;

      const result = push({ name: 'page view' }, { extra: true });

      // Original push was called with same args
      expect(originalPush).toHaveBeenCalledWith({ name: 'page view' }, { extra: true });
      expect(result).toBe('original-result');

      // Event was also captured
      expect(captured).toHaveLength(1);
      expect(captured[0].event).toEqual({ name: 'page view' });
    });

    it('does not touch sources without simulate flag', () => {
      const originalPush = jest.fn();
      const config: Record<string, unknown> = {
        sources: {
          express: { env: { push: originalPush } },
          browser: { env: { push: jest.fn() } },
        },
      };
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
      };

      applyOverrides(config, overrides);

      // express source should have push replaced
      const expressEnv = ((config.sources as Record<string, Record<string, unknown>>).express.env) as Record<string, unknown>;
      expect(expressEnv.push).not.toBe(originalPush);

      // browser source should keep original push
      const browserEnv = ((config.sources as Record<string, Record<string, unknown>>).browser.env) as Record<string, unknown>;
      expect(typeof browserEnv.push).toBe('function');
    });

    it('does not touch source when simulate is false', () => {
      const originalPush = jest.fn();
      const config: Record<string, unknown> = {
        sources: {
          express: { env: { push: originalPush } },
        },
      };
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: false },
        },
      };

      applyOverrides(config, overrides);

      const env = ((config.sources as Record<string, Record<string, unknown>>).express.env) as Record<string, unknown>;
      expect(env.push).toBe(originalPush);
    });

    it('skips sources not present in config', () => {
      const config: Record<string, unknown> = {
        sources: {
          express: { env: {} },
        },
      };
      const overrides: PushOverrides = {
        sources: {
          nonexistent: { simulate: true },
        },
      };

      // Should not throw
      const { captured } = applyOverrides(config, overrides);
      expect(captured).toEqual([]);
    });

    it('handles missing sources in config', () => {
      const config: Record<string, unknown> = {};
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
      };

      // Should not throw
      const { captured } = applyOverrides(config, overrides);
      expect(captured).toEqual([]);
    });
  });

  describe('combined overrides', () => {
    it('handles both destination and source overrides', () => {
      const config: Record<string, unknown> = {
        sources: {
          express: { env: {} },
        },
        destinations: {
          ga4: { config: {} },
        },
      };
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
        destinations: {
          ga4: { config: { mock: {} } },
        },
      };

      const { captured } = applyOverrides(config, overrides);

      // Destination was configured
      const dest = (config.destinations as Record<string, Record<string, unknown>>).ga4;
      expect((dest.config as Record<string, unknown>).mock).toEqual({});

      // Source env.push was replaced
      const env = ((config.sources as Record<string, Record<string, unknown>>).express.env) as Record<string, unknown>;
      expect(typeof env.push).toBe('function');

      // Captured array works
      (env.push as (...args: unknown[]) => void)({ name: 'test' });
      expect(captured).toHaveLength(1);
    });
  });

  describe('transformer mocks', () => {
    it('sets chainMocks on transformer config', () => {
      const config: Record<string, unknown> = {
        destinations: { ga4: { code: {}, config: {} } },
        transformers: { redact: { code: {}, config: {} } },
      };
      const overrides: PushOverrides = {
        transformerMocks: {
          'destination.ga4.before': { redact: { name: 'mocked' } },
        },
      };
      applyOverrides(config, overrides);
      expect(
        (
          (config.transformers as Record<string, Record<string, unknown>>)
            .redact.config as Record<string, unknown>
        ).chainMocks,
      ).toEqual({
        'destination.ga4.before': { name: 'mocked' },
      });
    });

    it('creates config object on transformer if missing', () => {
      const config: Record<string, unknown> = {
        destinations: { ga4: { code: {}, config: {} } },
        transformers: { redact: { code: {} } },
      };
      const overrides: PushOverrides = {
        transformerMocks: {
          'destination.ga4.before': { redact: { x: 1 } },
        },
      };
      applyOverrides(config, overrides);
      expect(
        (
          (config.transformers as Record<string, Record<string, unknown>>)
            .redact.config as Record<string, unknown>
        ).chainMocks,
      ).toEqual({
        'destination.ga4.before': { x: 1 },
      });
    });

    it('skips transformers not present in config', () => {
      const config: Record<string, unknown> = {
        destinations: { ga4: { config: {} } },
        transformers: {},
      };
      const overrides: PushOverrides = {
        transformerMocks: {
          'destination.ga4.before': { nonexistent: { y: 2 } },
        },
      };
      // Should not throw
      applyOverrides(config, overrides);
    });

    it('handles missing transformers section in config', () => {
      const config: Record<string, unknown> = {
        destinations: { ga4: { config: {} } },
      };
      const overrides: PushOverrides = {
        transformerMocks: {
          'destination.ga4.before': { redact: { z: 3 } },
        },
      };
      // Should not throw
      applyOverrides(config, overrides);
    });

    it('sets multiple chainMocks on the same transformer', () => {
      const config: Record<string, unknown> = {
        destinations: { ga4: { config: {} }, piwik: { config: {} } },
        transformers: { redact: { code: {}, config: {} } },
      };
      const overrides: PushOverrides = {
        transformerMocks: {
          'destination.ga4.before': { redact: { a: 1 } },
          'destination.piwik.next': { redact: { b: 2 } },
        },
      };
      applyOverrides(config, overrides);
      expect(
        (
          (config.transformers as Record<string, Record<string, unknown>>)
            .redact.config as Record<string, unknown>
        ).chainMocks,
      ).toEqual({
        'destination.ga4.before': { a: 1 },
        'destination.piwik.next': { b: 2 },
      });
    });
  });

  describe('empty overrides', () => {
    it('returns empty result with no overrides', () => {
      const config: Record<string, unknown> = {
        sources: { express: { env: { push: jest.fn() } } },
        destinations: { ga4: { config: {} } },
      };

      const { captured, trackingCalls } = applyOverrides(config, {});
      expect(captured).toEqual([]);
      expect(trackingCalls).toEqual([]);
    });
  });

  describe('wrapEnv integration', () => {
    it('wraps env with call tracking when simulation paths provided', () => {
      const config: Record<string, unknown> = {
        destinations: {
          gtag: { config: {} },
        },
      };

      const { trackingCalls } = applyOverrides(config, {
        destinations: {
          gtag: {
            env: { window: { gtag: (..._args: unknown[]) => {} } },
            simulation: ['window.gtag'],
          },
        },
      });

      expect(trackingCalls).toHaveLength(1);
      expect(trackingCalls[0].destId).toBe('gtag');
      expect(trackingCalls[0].calls).toHaveLength(0); // No calls yet
    });

    it('records calls when wrapped env functions are invoked', () => {
      const config: Record<string, unknown> = {
        destinations: {
          gtag: { config: {} },
        },
      };

      const { trackingCalls } = applyOverrides(config, {
        destinations: {
          gtag: {
            env: { window: { gtag: (..._args: unknown[]) => {} } },
            simulation: ['window.gtag'],
          },
        },
      });

      // Simulate what a destination would do
      const dest = (config.destinations as Record<string, any>).gtag;
      dest.config.env.window.gtag('event', 'purchase', { value: 42 });

      expect(trackingCalls[0].calls).toHaveLength(1);
      expect(trackingCalls[0].calls[0].fn).toBe('window.gtag');
      expect(trackingCalls[0].calls[0].args).toEqual([
        'event',
        'purchase',
        { value: 42 },
      ]);
      expect(trackingCalls[0].calls[0].ts).toBeGreaterThan(0);
    });

    it('strips simulation key from the wrappedEnv', () => {
      const config: Record<string, unknown> = {
        destinations: {
          gtag: { config: {} },
        },
      };

      applyOverrides(config, {
        destinations: {
          gtag: {
            env: { window: { gtag: () => {} } },
            simulation: ['window.gtag'],
          },
        },
      });

      const dest = (config.destinations as Record<string, any>).gtag;
      expect(dest.config.env).not.toHaveProperty('simulation');
    });

    it('does not wrap when simulation array is empty', () => {
      const config: Record<string, unknown> = {
        destinations: {
          gtag: { config: {} },
        },
      };

      const { trackingCalls } = applyOverrides(config, {
        destinations: {
          gtag: {
            env: { window: { gtag: () => {} } },
            simulation: [],
          },
        },
      });

      expect(trackingCalls).toHaveLength(0);
    });

    it('tracks multiple destinations independently', () => {
      const config: Record<string, unknown> = {
        destinations: {
          gtag: { config: {} },
          fbq: { config: {} },
        },
      };

      const { trackingCalls } = applyOverrides(config, {
        destinations: {
          gtag: {
            env: { window: { gtag: (..._args: unknown[]) => {} } },
            simulation: ['window.gtag'],
          },
          fbq: {
            env: { window: { fbq: (..._args: unknown[]) => {} } },
            simulation: ['window.fbq'],
          },
        },
      });

      expect(trackingCalls).toHaveLength(2);

      const gtagDest = (config.destinations as Record<string, any>).gtag;
      gtagDest.config.env.window.gtag('config', 'G-123');

      const fbqDest = (config.destinations as Record<string, any>).fbq;
      fbqDest.config.env.window.fbq('track', 'Purchase');

      const gtagCalls = trackingCalls.find((t) => t.destId === 'gtag')!.calls;
      const fbqCalls = trackingCalls.find((t) => t.destId === 'fbq')!.calls;

      expect(gtagCalls).toHaveLength(1);
      expect(gtagCalls[0].fn).toBe('window.gtag');
      expect(fbqCalls).toHaveLength(1);
      expect(fbqCalls[0].fn).toBe('window.fbq');
    });
  });
});
