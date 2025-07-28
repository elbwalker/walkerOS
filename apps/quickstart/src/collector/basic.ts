import { createCollector } from '@walkeros/collector';
import { createSource } from '@walkeros/core';
import { sourceBrowser } from '@walkeros/web-source-browser';
import type { Collector, WalkerOS, Source } from '@walkeros/core';
import type { SourceInit } from '@walkeros/collector';

// Helper function to wrap createSource result for collector compatibility
function wrapSource<T extends Source.Config, E>(
  sourceInit: Source.Init<T, E>,
): SourceInit<T, E> {
  return {
    code: sourceInit,
  };
}

export async function setupCollector(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  // Single big config file - basic setup
  const trackingConfig = {
    run: true,
    sources: {
      browser: wrapSource(
        createSource(sourceBrowser, {
          settings: {
            scope: document.body,
          },
        }),
      ),
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
      browser: wrapSource(
        createSource(sourceBrowser, {
          settings: {
            scope: document.body,
          },
        }),
      ),
    },
    destinations: {
      console: {
        type: 'console',
        push: (event: WalkerOS.Event) => console.log('Event:', event),
        config: {},
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
