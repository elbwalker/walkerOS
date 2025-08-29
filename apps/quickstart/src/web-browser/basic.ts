import { createCollector } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';

export async function setupBrowserTracking(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector();
  return { collector, elb };
}

export async function setupBrowserWithConsole(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector({
    destinations: {
      console: {
        push: (event) => console.log('Event:', event),
      },
    },
  });
  return { collector, elb };
}
