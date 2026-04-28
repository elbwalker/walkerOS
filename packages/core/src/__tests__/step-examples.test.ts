import { getFlowSettings } from '../flow';
import type { Flow } from '../types';

describe('Step Examples', () => {
  const setup: Flow.Json = {
    version: 4,
    flows: {
      default: {
        config: { platform: 'web' },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            examples: {
              pageview: {
                in: { url: 'https://example.com' },
                out: [
                  [
                    'elb',
                    {
                      name: 'page view',
                      data: { url: 'https://example.com' },
                    },
                  ],
                ],
              },
            },
          },
        },
        destinations: {
          gtag: {
            package: '@walkeros/web-destination-gtag',
            examples: {
              purchase: {
                in: {
                  name: 'order complete',
                  data: { id: 'ORD-123', total: 149.97 },
                },
                out: [
                  [
                    'gtag',
                    'event',
                    'purchase',
                    { transaction_id: 'ORD-123', value: 149.97 },
                  ],
                ],
              },
              filtered: {
                in: { name: 'internal click', data: {} },
                out: [],
              },
            },
          },
        },
      },
    },
  };

  it('should accept examples in flow types', () => {
    // Type check: this compiles without error
    expect(setup.flows.default.destinations!.gtag.examples).toBeDefined();
    expect(setup.flows.default.sources!.browser.examples).toBeDefined();
  });

  it('should strip examples during getFlowSettings resolution', () => {
    const config = getFlowSettings(setup);
    // examples should be stripped by the field whitelist
    expect(
      (config.sources!.browser as { examples?: unknown }).examples,
    ).toBeUndefined();
    expect(
      (config.destinations!.gtag as { examples?: unknown }).examples,
    ).toBeUndefined();
  });
});
