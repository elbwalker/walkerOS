import { startFlow } from '@walkeros/collector';
import type { Logger } from '@walkeros/core';
import { createEvent, getEvent, Level } from '@walkeros/core';
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

  it('writes one DEBUG line naming the event and the mapping key for a declared skip', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
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
    const analytics: SegmentSDK = { load: () => instance };
    const { elb } = await startFlow({
      logger: { level: 'DEBUG', handler },
      destinations: {
        segment: {
          code: { ...destinationSegment, env: { analytics } },
          config: {
            settings: { apiKey: 'key' },
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: { group: { map: { groupId: 'data.none' } } },
                },
              },
            },
          },
        },
      },
    });

    expect((await elb(createEvent({ name: 'company update' }))).ok).toBe(true);
    expect(lines.filter(([, message]) => message.includes('skipped'))).toEqual([
      [
        Level.DEBUG,
        'Segment skipped group: group resolved to nothing',
        expect.objectContaining({ event: 'company update' }),
      ],
    ]);
  });
});
