import { createCollector } from '@walkeros/collector';
import { sourceBrowser } from '@walkeros/web-source-browser';
import type { Collector, WalkerOS } from '@walkeros/core';

export async function setupCollector(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  // Single big config file - basic setup
  const trackingConfig = {
    run: true,
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          settings: {
            scope: 'body',
            pageview: true,
          },
        },
      },
    },
  };

  const { collector, elb } = await createCollector(trackingConfig);
  return { collector, elb };
}

export async function setupCollectorWithConfig(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  // Single big config file with console destination
  const trackingConfig = {
    run: true,
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          settings: {
            scope: 'body',
            pageview: true,
            session: true,
          },
        },
      },
    },
    destinations: {
      console: {
        code: {
          type: 'console',
          push: (event: WalkerOS.Event) => console.log('Event:', event),
          config: {},
        },
      },
    },
  };

  const { collector, elb } = await createCollector(trackingConfig);
  return { collector, elb };
}

export async function trackPageView(elb: WalkerOS.Elb): Promise<void> {
  await elb('page view', {
    title: 'Home Page',
    path: '/',
  });
}

export async function trackUserAction(elb: WalkerOS.Elb): Promise<void> {
  await elb('button click', {
    id: 'cta-button',
    text: 'Get Started',
  });
}
