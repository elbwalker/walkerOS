import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

export async function firstEvent(): Promise<string[]> {
  const seen: string[] = [];

  const { elb } = await startFlow({
    destinations: {
      console: {
        code: {
          type: 'console',
          config: {},
          push(event: WalkerOS.Event) {
            seen.push(event.name);
            console.log('Event:', event.name);
          },
        },
      },
    },
  });

  await elb('page view', { title: 'Home' });

  return seen;
}

export default firstEvent;
