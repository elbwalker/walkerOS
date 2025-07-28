import { createCollector } from '@walkerOS/collector';
import { destinationPlausible } from '@walkerOS/web-destination-plausible';
import type { WalkerOS, Collector } from '@walkerOS/core';

export async function setupPlausible(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      plausible: {
        ...destinationPlausible,
        config: {
          settings: {
            domain: 'yourdomain.com',
            apiHost: 'https://plausible.io',
          },
          mapping: {
            // Custom goal tracking
            form: {
              submit: {
                name: 'Contact Form',
              },
            },
            file: {
              download: {
                name: 'Download',
                data: {
                  map: {
                    filename: 'data.filename',
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

export async function trackPlausibleEvents(elb: WalkerOS.Elb): Promise<void> {
  await elb('form submit', {
    type: 'contact',
  });

  await elb('file download', {
    filename: 'whitepaper.pdf',
  });
}
