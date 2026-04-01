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

      applyOverrides(config, overrides);

      const dest = (
        config.destinations as Record<string, Record<string, unknown>>
      ).ga4;
      expect((dest.config as Record<string, unknown>).mock).toEqual({
        status: 200,
      });
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

      const dest = (
        config.destinations as Record<string, Record<string, unknown>>
      ).meta;
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

      const dest = (
        config.destinations as Record<string, Record<string, unknown>>
      ).ga4;
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
      applyOverrides(config, overrides);
    });

    it('handles missing destinations in config', () => {
      const config: Record<string, unknown> = {};
      const overrides: PushOverrides = {
        destinations: {
          ga4: { config: { mock: {} } },
        },
      };

      // Should not throw
      applyOverrides(config, overrides);
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

      const dest = (
        config.destinations as Record<string, Record<string, unknown>>
      ).ga4;
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

      const dest = (
        config.destinations as Record<string, Record<string, unknown>>
      ).ga4;
      expect((dest.config as Record<string, unknown>).env).toEqual({
        window: { gtag: expect.any(Function) },
      });
    });
  });

  describe('source overrides', () => {
    it('does not modify source env.push (capture handled by collector.push override)', () => {
      const originalPush = jest.fn();
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

      applyOverrides(config, overrides);

      // env.push should remain unchanged
      const source = (config.sources as Record<string, Record<string, unknown>>)
        .express;
      const env = source.env as Record<string, unknown>;
      expect(env.push).toBe(originalPush);
    });

    it('handles missing sources in config', () => {
      const config: Record<string, unknown> = {};
      const overrides: PushOverrides = {
        sources: {
          express: { simulate: true },
        },
      };

      // Should not throw
      applyOverrides(config, overrides);
    });
  });

  describe('combined overrides', () => {
    it('handles both destination and source overrides', () => {
      const originalPush = jest.fn();
      const config: Record<string, unknown> = {
        sources: {
          express: { env: { push: originalPush } },
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

      applyOverrides(config, overrides);

      // Destination was configured
      const dest = (
        config.destinations as Record<string, Record<string, unknown>>
      ).ga4;
      expect((dest.config as Record<string, unknown>).mock).toEqual({});

      // Source env.push unchanged (capture handled elsewhere)
      const env = (config.sources as Record<string, Record<string, unknown>>)
        .express.env as Record<string, unknown>;
      expect(env.push).toBe(originalPush);
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
    it('does not throw with no overrides', () => {
      const config: Record<string, unknown> = {
        sources: { express: { env: { push: jest.fn() } } },
        destinations: { ga4: { config: {} } },
      };

      // Should not throw
      applyOverrides(config, {});
    });
  });
});
