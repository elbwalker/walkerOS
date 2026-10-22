import { startFlow } from '@walkeros/collector';
import { clone, getEvent } from '@walkeros/core';
import { destinationPinterest } from '..';
import { examples } from '../dev';
import type { Pintrk } from '../types';

describe('pinterest destination consent', () => {
  it('follows the whole consent state: an unrelated update keeps tracking, a revocation stops it', async () => {
    const tracked: unknown[] = [];
    const env = clone(examples.env.push);
    const pintrk: Pintrk = Object.assign(
      (...args: unknown[]) => {
        if (args[0] === 'track') tracked.push(args[1]);
      },
      { queue: [], version: '3.0' },
    );
    env.window.pintrk = pintrk;
    const { elb } = await startFlow({
      destinations: {
        pinterest: {
          code: { ...destinationPinterest, env },
          config: {
            consent: { marketing: true },
            loadScript: false,
            settings: { apiKey: '2612345678901' },
          },
        },
      },
    });

    await elb('walker consent', { marketing: true });
    await elb('walker consent', { analytics: false });
    await elb(getEvent('product view'));
    await elb('walker consent', { marketing: false });
    await elb('walker consent', { marketing: true });
    await elb(getEvent('product add'));

    expect(tracked).toEqual(['product view', 'product add']);
  });
});
