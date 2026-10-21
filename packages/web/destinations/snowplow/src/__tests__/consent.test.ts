import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationSnowplow } from '..';
import type { Env, SnowplowFunction } from '../types';

describe('snowplow destination consent', () => {
  it('turns the tracker senders off on a revocation and on again on a grant', async () => {
    const calls: unknown[][] = [];
    const snowplow: SnowplowFunction = Object.assign(
      (...args: unknown[]) => {
        calls.push(args);
      },
      { q: [] },
    );
    const env: Env = { window: { snowplow } };
    const activityTracking = { minimumVisitLength: 30, heartbeatDelay: 10 };
    const linkClicks = { trackContent: true };
    const { elb } = await startFlow({
      destinations: {
        snowplow: {
          code: { ...destinationSnowplow, env },
          config: {
            consent: { marketing: true },
            settings: {
              collectorUrl: 'https://collector.example.com',
              activityTracking,
              plugins: [
                {
                  url: 'https://cdn.example.com/link-click-tracking.js',
                  name: [
                    'snowplowLinkClickTracking',
                    'LinkClickTrackingPlugin',
                  ],
                  options: linkClicks,
                },
              ],
            },
          },
        },
      },
    });

    await elb('walker consent', { marketing: true });
    await elb(getEvent('page view'));
    calls.length = 0;

    await elb('walker consent', { marketing: false });
    expect(calls).toEqual([
      ['disableActivityTracking'],
      ['disableLinkClickTracking'],
    ]);

    calls.length = 0;
    await elb('walker consent', { marketing: true });
    expect(calls).toEqual([
      ['enableActivityTracking', activityTracking],
      ['enableLinkClickTracking', linkClicks],
    ]);
  });
});
