import { createCollector } from '@walkeros/collector';
import { destinationGtag } from '@walkeros/web-destination-gtag';
import type { WalkerOS, Collector } from '@walkeros/core';

export async function setupGA4Complete(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      gtag: {
        ...destinationGtag,
        config: {
          settings: {
            ga4: {
              measurementId: 'G-XXXXXXXXXX',
            },
          },
          mapping: {
            // Page view
            page: {
              view: {
                name: 'page_view',
                settings: { ga4: {} },
              },
            },
            // Product events
            product: {
              view: {
                name: 'view_item',
                settings: { ga4: {} },
                data: {
                  map: {
                    currency: { value: 'USD' },
                    value: 'data.price',
                  },
                },
              },
            },
            // Purchase event
            order: {
              complete: {
                name: 'purchase',
                settings: { ga4: {} },
                data: {
                  map: {
                    transaction_id: 'data.id',
                    value: 'data.total',
                    currency: { value: 'USD' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return { collector, elb };
}

export async function trackGA4Events(elb: WalkerOS.Elb): Promise<void> {
  await elb('page view', {
    title: 'Home Page',
    path: '/',
  });

  await elb('product view', {
    id: 'prod-123',
    name: 'Red Sneakers',
    price: 99.99,
  });

  await elb('order complete', {
    id: 'order-456',
    total: 109.98,
  });
}
