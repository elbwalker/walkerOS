import { createCollector } from '@walkerOS/collector';
import { destinationGtag } from '@walkerOS/web-destination-gtag';
import type { WalkerOS, Collector } from '@walkerOS/core';

export async function setupGoogleAds(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      gtag: {
        ...destinationGtag,
        config: {
          settings: {
            ads: {
              conversionId: 'AW-XXXXXXXXX',
            },
          },
          mapping: {
            order: {
              complete: {
                name: 'conversion',
                settings: { ads: {} },
                data: {
                  map: {
                    value: 'data.total',
                    currency: 'data.currency',
                    transaction_id: 'data.id',
                  },
                },
              },
            },
            form: {
              submit: {
                name: 'conversion',
                settings: { ads: { conversionLabel: 'LEAD' } },
                data: {
                  map: {
                    value: { value: 0, key: 'data.value' },
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

export async function trackAdsConversions(elb: WalkerOS.Elb): Promise<void> {
  await elb('order complete', {
    id: 'order-789',
    total: 129.99,
    currency: 'USD',
  });

  await elb('form submit', {
    type: 'lead',
    value: 50,
  });
}
