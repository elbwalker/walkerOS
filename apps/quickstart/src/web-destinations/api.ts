import { createCollector } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/web-destination-api';
import { sourceBrowser } from '@walkeros/web-source-browser';
import type { WalkerOS, Collector, Source } from '@walkeros/core';

export async function setupAPIDestination(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  // Single big config file - API destination setup
  const trackingConfig = {
    run: true,
    globals: {
      environment: 'production',
      api_version: 'v1',
    },
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          settings: {
            scope: document.body,
            session: true,
          },
        },
      },
    },
    destinations: {
      api: {
        code: destinationAPI,
        config: {
          settings: {
            url: 'https://api.example.com/events',
            headers: {
              'X-API-Key': 'your-api-key',
              'Content-Type': 'application/json',
            },
          },
          mapping: {
            page: {
              view: {
                name: 'pageview',
                data: {
                  map: {
                    url: 'data.url',
                    title: 'data.title',
                    timestamp: 'timestamp',
                  },
                },
              },
            },
            order: {
              complete: {
                name: 'purchase',
                data: {
                  map: {
                    order_id: 'data.id',
                    revenue: 'data.total',
                    currency: 'data.currency',
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const { collector, elb } = await createCollector(trackingConfig);
  return { collector, elb };
}

export async function trackAPIEvents(elb: WalkerOS.Elb): Promise<void> {
  await elb('page view', {
    url: '/products',
    title: 'Products Page',
  });

  await elb('order complete', {
    id: 'order-999',
    total: 249.99,
  });
}
