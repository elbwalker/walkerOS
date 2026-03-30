import { applyOverrides } from '../../../commands/push/apply-overrides.js';

describe('applyOverrides', () => {
  describe('destination env without simulation', () => {
    it('assigns env directly when no simulation paths', () => {
      const config: Record<string, unknown> = {
        destinations: {
          gtag: { config: {} },
        },
      };

      const { trackingCalls } = applyOverrides(config, {
        destinations: {
          gtag: {
            env: { window: { gtag: () => {} } },
          },
        },
      });

      const dest = (config.destinations as Record<string, any>).gtag;
      expect(dest.config.env).toHaveProperty('window');
      expect(trackingCalls).toHaveLength(0);
    });
  });

  describe('destination env with simulation paths', () => {
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

      // Simulate what a destination would do: call the env function
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

    it('strips simulation key from the wrappedEnv assigned to config', () => {
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

      // Call gtag env
      const gtagDest = (config.destinations as Record<string, any>).gtag;
      gtagDest.config.env.window.gtag('config', 'G-123');

      // Call fbq env
      const fbqDest = (config.destinations as Record<string, any>).fbq;
      fbqDest.config.env.window.fbq('track', 'Purchase');

      const gtagCalls = trackingCalls.find((t) => t.destId === 'gtag')!.calls;
      const fbqCalls = trackingCalls.find((t) => t.destId === 'fbq')!.calls;

      expect(gtagCalls).toHaveLength(1);
      expect(gtagCalls[0].fn).toBe('window.gtag');
      expect(fbqCalls).toHaveLength(1);
      expect(fbqCalls[0].fn).toBe('window.fbq');
    });

    it('handles empty simulation array like no simulation', () => {
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

      // Empty simulation = no wrapping, direct env assignment
      expect(trackingCalls).toHaveLength(0);
      const dest = (config.destinations as Record<string, any>).gtag;
      expect(dest.config.env).toHaveProperty('window');
    });
  });

  describe('return structure', () => {
    it('returns both captured and trackingCalls', () => {
      const config: Record<string, unknown> = {
        destinations: {
          gtag: { config: {} },
        },
        sources: {
          web: { env: {} },
        },
      };

      const result = applyOverrides(config, {
        destinations: {
          gtag: {
            env: { window: { gtag: (..._args: unknown[]) => {} } },
            simulation: ['window.gtag'],
          },
        },
        sources: {
          web: { simulate: true },
        },
      });

      expect(result).toHaveProperty('trackingCalls');
      expect(Array.isArray(result.trackingCalls)).toBe(true);
    });
  });
});
