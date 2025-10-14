import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import { destinationAPI } from '@walkeros/web-destination-api';
import { destinationGtag } from '@walkeros/web-destination-gtag';

/**
 * Complete minimal walkerOS web setup
 *
 * Demonstrates:
 * - Browser source with DOM event capture
 * - Inline console destination for debugging
 * - API destination for HTTP endpoints
 * - Google gtag destination for GA4 + Ads
 * - Complete event mapping for e-commerce
 */
export async function setupWebBasic(): Promise<{
  collector: unknown;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await startFlow({
    // Browser source captures DOM events, handles sessions and pageviews
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          settings: {
            pageview: true,
            session: true,
            elb: 'elb', // Makes window.elb available globally
            prefix: 'data-elb',
          },
        },
      },
    },

    // Multiple destinations process events in parallel
    destinations: {
      // 1. Simple console destination for debugging
      console: {
        code: {
          type: 'console',
          config: {},
          push(event: WalkerOS.Event) {
            console.log('📊 Event captured:', {
              name: event.name,
              data: event.data,
              timing: event.timing,
            });
          },
        },
      },

      // 2. API destination sends events to HTTP endpoint
      api: {
        code: destinationAPI,
        config: {
          settings: {
            url: 'https://analytics.example.com/events',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': 'your-api-key',
            },
          },
        },
        env: {
          // Mock sendWeb function
          sendWeb: (url: unknown, body: unknown, options: unknown) => {
            console.log('📡 API Call:', { url, body, options });
          },
        },
      },

      // 3. Google gtag destination for GA4 and Google Ads
      gtag: {
        code: destinationGtag,
        config: {
          settings: {
            ga4: {
              measurementId: 'G-XXXXXXXXXX',
            },
            ads: {
              conversionId: 'AW-XXXXXXXXX',
            },
          },
          mapping: {
            // E-commerce purchase event mapping
            order: {
              complete: {
                name: 'purchase',
                settings: {
                  ga4: {
                    include: ['data', 'context'],
                  },
                  ads: {},
                },
                data: {
                  map: {
                    transaction_id: 'data.id',
                    value: 'data.total',
                    currency: { key: 'data.currency', value: 'EUR' },
                    tax: 'data.tax',
                    shipping: 'data.shipping',
                    items: {
                      loop: [
                        'nested',
                        {
                          condition: (entity) =>
                            (entity as WalkerOS.Entity).entity === 'product',
                          map: {
                            item_id: 'data.id',
                            item_name: 'data.name',
                            quantity: { key: 'data.quantity', value: 1 },
                            price: 'data.price',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        env: {
          window: {
            gtag: (...args: unknown[]) => {
              console.log('🎯 Gtag Call:', args);
            },
          },
        },
      },
    },
  });

  return { collector, elb };
}

export default setupWebBasic;
