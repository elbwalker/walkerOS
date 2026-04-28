/**
 * Minimal web flow used across size-budget, jsdom-smoke, and contract tests.
 * Browser source + api destination — the smallest meaningful production shape.
 */
export const MINIMAL_FLOW = {
  version: 4,
  flows: {
    default: {
      config: { platform: 'web' },
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
          config: {
            settings: {
              prefix: 'data-elb',
              pageview: true,
              elb: 'elb',
              elbLayer: 'elbLayer',
            },
          },
        },
      },
      destinations: {
        api: {
          package: '@walkeros/web-destination-api',
          config: {
            settings: {
              url: 'https://example.com/events',
              method: 'POST',
              transport: 'fetch',
            },
          },
        },
      },
    },
  },
} as const;
