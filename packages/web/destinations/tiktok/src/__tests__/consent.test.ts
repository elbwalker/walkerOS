import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { destinationTikTok } from '..';
import { examples } from '../dev';

describe('tiktok destination consent', () => {
  it('follows the whole consent state: an unrelated update keeps cookies on', async () => {
    const calls: string[] = [];
    const env = clone(examples.env.push);
    env.window.ttq.enableCookie = () => {
      calls.push('enableCookie');
    };
    env.window.ttq.disableCookie = () => {
      calls.push('disableCookie');
    };
    const { elb } = await startFlow({
      destinations: {
        tiktok: {
          code: { ...destinationTikTok, env },
          config: {
            consent: { marketing: true },
            loadScript: false,
            settings: { apiKey: 'k' },
          },
        },
      },
    });

    await elb('walker consent', { marketing: true });
    await elb('walker consent', { analytics: true });
    await elb('walker consent', { marketing: false });

    expect(calls).toEqual(['enableCookie', 'disableCookie']);
  });
});
