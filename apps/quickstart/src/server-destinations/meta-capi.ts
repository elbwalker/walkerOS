import { createCollector } from '@walkerOS/collector';
import type { WalkerOS, Collector } from '@walkerOS/core';

export async function setupMetaCAPI(): Promise<{
  collector: Collector.Instance;
  elb: WalkerOS.Elb;
}> {
  const { collector, elb } = await createCollector();
  return { collector, elb };
}

export const metaCAPIConfig = {
  settings: {
    pixelId: 'YOUR_PIXEL_ID',
    accessToken: process.env.META_ACCESS_TOKEN || '',
    test_event_code: process.env.META_TEST_EVENT_CODE,
  },
};

export async function trackServerConversions(elb: WalkerOS.Elb): Promise<void> {
  await elb({
    event: 'order complete',
    user: {
      id: 'user-456',
      email: 'customer@example.com',
    },
    data: {
      id: 'order-789',
      total: 199.99,
      currency: 'USD',
    },
  });

  await elb({
    event: 'form submit',
    user: {
      id: 'user-789',
      email: 'lead@example.com',
      phone: '+1234567890',
    },
    data: {
      type: 'contact',
      value: 100,
    },
  });
}
