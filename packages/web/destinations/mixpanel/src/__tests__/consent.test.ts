import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { destinationMixpanel } from '..';
import { examples } from '../dev';

describe('mixpanel destination consent', () => {
  it('follows the whole consent state: an unrelated update keeps tracking on', async () => {
    const calls: string[] = [];
    const env = clone(examples.env.push);
    const mixpanel = env.mixpanel;
    if (!mixpanel) throw new Error('env.mixpanel missing');
    mixpanel.opt_in_tracking = () => {
      calls.push('opt_in');
    };
    mixpanel.opt_out_tracking = () => {
      calls.push('opt_out');
    };
    const { elb } = await startFlow({
      destinations: {
        mixpanel: {
          code: { ...destinationMixpanel, env },
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
