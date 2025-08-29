import { createCollector } from '@walkeros/collector';
import type { WalkerOS, Collector } from '@walkeros/core';

export async function setupDataLayer(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector();
  return { collector, elb };
}
