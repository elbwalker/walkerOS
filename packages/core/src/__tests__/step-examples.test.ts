import { getFlowSettings } from '../flow';
import type { Flow } from '../types';

describe('Step Examples', () => {
  const setup: Flow.Config = {
    version: 1,
    flows: {
      default: {
        web: {},
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            examples: {
              pageview: {
                in: { url: 'https://example.com' },
                out: {
                  name: 'page view',
                  data: { url: 'https://example.com' },
                },
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
                  'event',
                  'purchase',
                  { transaction_id: 'ORD-123', value: 149.97 },
                ],
              },
              filtered: {
                in: { name: 'internal click', data: {} },
                out: false,
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
    expect((config.sources!.browser as any).examples).toBeUndefined();
    expect((config.destinations!.gtag as any).examples).toBeUndefined();
  });
});
