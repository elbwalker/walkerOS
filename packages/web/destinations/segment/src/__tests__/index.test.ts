import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationSegment } from '..';
import type { SegmentAnalytics, SegmentSDK } from '../types';

describe('segment destination', () => {
  it('passes cdnURL in the load() settings, where Analytics.js reads it', async () => {
    const loads: unknown[][] = [];
    const noop = () => undefined;
    const instance: SegmentAnalytics = {
      track: noop,
      identify: noop,
      group: noop,
      page: noop,
      alias: noop,
      reset: noop,
      setAnonymousId: noop,
    };
    const analytics: SegmentSDK = {
      load: (...args) => {
        loads.push(args);
        return instance;
      },
    };
    const { elb } = await startFlow({
      destinations: {
        segment: {
          code: { ...destinationSegment, env: { analytics } },
          config: {
            settings: { apiKey: 'key', cdnURL: 'https://cdn.example.com' },
          },
        },
      },
    });

    await elb(getEvent('page view'));

    expect(loads).toEqual([
      [
        { writeKey: 'key', cdnURL: 'https://cdn.example.com' },
        { initialPageview: false },
      ],
    ]);
  });
});
