import { createCollector } from '@walkerOS/collector';
import type { WalkerOS, Collector } from '@walkerOS/core';

export async function setupDataLayer(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector();
  return { collector, elb };
}
