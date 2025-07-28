import { createCollector } from '@walkeros/collector';
import { createSource, createDestination } from '@walkeros/core';
import { destinationGtag } from '@walkeros/web-destination-gtag';
import { sourceBrowser } from '@walkeros/web-source-browser';
import type { WalkerOS, Collector, Source } from '@walkeros/core';
import type { SourceInit } from '@walkeros/collector';

// Helper function to wrap createSource result for collector compatibility
function wrapSource<T extends Source.Config, E>(
  sourceInit: Source.Init<T, E>,
): SourceInit<T, E> {
  return {
    code: sourceInit,
  };
}

export async function setupGtagComplete(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  // Single big config file approach - complete tracking setup
  const trackingConfig = {
    run: true,
    globals: {
      environment: 'production',
      version: '1.0.0',
    },
    sources: {
      browser: wrapSource(
        createSource(sourceBrowser, {
          settings: {
            scope: document.body,
            session: true,
          },
        }),
      ),
    },
    destinations: {
      gtag: createDestination(destinationGtag, {
        settings: {
          ga4: {
            measurementId: 'G-XXXXXXXXXX',
          },
          ads: {
            conversionId: 'AW-XXXXXXXXX',
          },
          gtm: {
            containerId: 'GTM-XXXXXXX',
          },
        },
        mapping: {
          // GA4 Purchase mapping
          order: {
            complete: {
              name: 'purchase',
              settings: {
                ga4: { include: ['data'] },
              },
              data: {
                map: {
                  transaction_id: 'data.id',
                  value: 'data.total',
                  currency: { value: 'USD', key: 'data.currency' },
                },
              },
            },
          },
          // Google Ads conversion mapping
          form: {
            submit: {
              name: 'conversion',
              settings: {
                ads: { label: 'LEAD' },
              },
              data: {
                map: {
                  value: { value: 0, key: 'data.value' },
                  currency: { value: 'USD' },
                },
              },
            },
          },
          // GTM custom event
          product: {
            view: {
              name: 'product_view',
              settings: {
                gtm: {},
              },
              data: {
                map: {
                  product_id: 'data.id',
                  product_name: 'data.name',
                  value: 'data.price',
                },
              },
            },
          },
        },
      }),
    },
  };

  const { collector, elb } = await createCollector(trackingConfig);
  return { collector, elb };
}

export async function trackGtagEvents(elb: WalkerOS.Elb): Promise<void> {
  // GA4 purchase event
  await elb('order complete', {
    id: 'order-123',
    total: 99.99,
    currency: 'USD',
  });

  // Google Ads lead conversion
  await elb('form submit', {
    type: 'lead',
    value: 50,
  });

  // GTM product view
  await elb('product view', {
    id: 'prod-456',
    name: 'Blue Jacket',
    price: 79.99,
  });
}
