import { startFlow } from '@walkeros/collector';
import type { Logger } from '@walkeros/core';
import { getEvent, Level } from '@walkeros/core';
import { destinationSnowplow } from '..';
import type { Env, SnowplowFunction } from '../types';

describe('snowplow destination consent', () => {
  it('turns activity pings and the plugin senders off on a revocation and on again on a grant', async () => {
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
    const forms = { options: { forms: { allowlist: ['checkout'] } } };
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
                {
                  url: 'https://cdn.example.com/form-tracking.js',
                  name: ['snowplowFormTracking', 'FormTrackingPlugin'],
                  options: forms,
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
      ['disableFormTracking'],
    ]);

    calls.length = 0;
    await elb('walker consent', { marketing: true });
    expect(calls).toEqual([
      ['enableActivityTracking', activityTracking],
      ['enableLinkClickTracking', linkClicks],
      ['enableFormTracking', forms],
    ]);
  });

  it('fails a revocation with consent-not-applied for a plugin without an off switch', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
    const snowplow: SnowplowFunction = Object.assign(() => undefined, {
      q: [],
    });
    const env: Env = { window: { snowplow } };
    const { elb } = await startFlow({
      // The default level: only ERROR lines reach the handler.
      logger: { handler },
      destinations: {
        snowplow: {
          code: { ...destinationSnowplow, env },
          config: {
            consent: { marketing: true },
            settings: {
              collectorUrl: 'https://collector.example.com',
              plugins: [
                {
                  url: 'https://cdn.example.com/error-tracking.js',
                  name: ['snowplowErrorTracking', 'ErrorTrackingPlugin'],
                },
              ],
            },
          },
        },
      },
    });

    await elb('walker consent', { marketing: true });
    expect(lines).toEqual([]);

    await elb('walker consent', { marketing: false });
    expect(lines).toEqual([
      [
        Level.ERROR,
        expect.stringContaining('consent not applied'),
        expect.objectContaining({
          code: 'consent-not-applied',
          error:
            'Snowplow ErrorTrackingPlugin has no off switch, so it keeps sending after a revocation',
        }),
      ],
    ]);
  });
});
