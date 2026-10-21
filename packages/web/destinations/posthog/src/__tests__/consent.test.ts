import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { destinationPostHog } from '..';
import { examples } from '../dev';

describe('posthog destination consent', () => {
  it('follows the whole consent state: an unrelated update keeps capturing on', async () => {
    const calls: string[] = [];
    const env = clone(examples.env.push);
    const posthog = env.posthog;
    if (!posthog) throw new Error('env.posthog missing');
    posthog.opt_in_capturing = () => {
      calls.push('opt_in');
    };
    posthog.opt_out_capturing = () => {
      calls.push('opt_out');
    };
    const { elb } = await startFlow({
      destinations: {
        posthog: {
          code: { ...destinationPostHog, env },
          config: { consent: { analytics: true }, settings: { apiKey: 'k' } },
        },
      },
    });

    await elb('walker consent', { analytics: true });
    await elb('walker consent', { marketing: true });
    await elb('walker consent', { analytics: false });

    expect(calls).toEqual(['opt_in', 'opt_out']);
  });
});
