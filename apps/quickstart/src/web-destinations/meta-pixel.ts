import { createCollector } from '@walkerOS/collector';
import { createSource, createDestination } from '@walkerOS/core';
import { destinationMeta } from '@walkerOS/web-destination-meta';
import { sourceBrowser } from '@walkerOS/web-source-browser';
import type { WalkerOS, Collector, Source } from '@walkerOS/core';
import type { SourceInit } from '@walkerOS/collector';

// Helper function to wrap createSource result for collector compatibility
function wrapSource<T extends Source.Config, E>(
  sourceInit: Source.Init<T, E>,
): SourceInit<T, E> {
  return {
    code: sourceInit,
  };
}

export async function setupMetaPixel(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  // Single big config file - Meta Pixel tracking setup
  const trackingConfig = {
    run: true,
    globals: {
      environment: 'production',
      currency: 'USD',
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
      meta: createDestination(destinationMeta, {
        settings: {
          pixelId: 'YOUR_PIXEL_ID',
        },
        mapping: {
          page: {
            view: { name: 'PageView' },
          },
          product: {
            add: {
              name: 'AddToCart',
              data: {
                map: {
                  value: 'data.price',
                  currency: 'data.currency',
                  content_ids: ['data.id'],
                  content_name: 'data.name',
                },
              },
            },
          },
          order: {
            complete: {
              name: 'Purchase',
              data: {
                map: {
                  value: 'data.total',
                  currency: 'data.currency',
                  content_ids: ['data.id'],
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

export async function trackMetaEvents(elb: WalkerOS.Elb): Promise<void> {
  await elb('page view');

  await elb('product add', {
    id: 'prod-456',
    name: 'Summer Dress',
    price: 49.99,
    currency: 'USD',
  });

  await elb('order complete', {
    id: 'order-123',
    total: 99.98,
    currency: 'USD',
  });
}
