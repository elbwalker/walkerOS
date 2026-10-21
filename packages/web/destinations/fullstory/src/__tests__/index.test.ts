import { startFlow } from '@walkeros/collector';
import type { Logger } from '@walkeros/core';
import { createEvent, getEvent, Level } from '@walkeros/core';
import { destinationFullStory } from '..';
import type { FullStorySDK } from '../types';

function recordingFS(calls: unknown[][]): FullStorySDK {
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  return {
    init: record('init'),
    trackEvent: record('trackEvent'),
    setIdentity: record('setIdentity'),
    setProperties: record('setProperties'),
    shutdown: record('shutdown'),
    start: record('start'),
  };
}

describe('fullstory destination', () => {
  it('stops capture on a revocation without settings.consent when the destination is consent-gated', async () => {
    const calls: unknown[][] = [];
    const { elb } = await startFlow({
      destinations: {
        fullstory: {
          code: {
            ...destinationFullStory,
            env: { fullstory: recordingFS(calls) },
          },
          config: { consent: { analytics: true }, settings: { orgId: 'o-1' } },
        },
      },
    });

    await elb('walker consent', { analytics: true });
    await elb(getEvent('page view'));
    await elb('walker consent', { analytics: false });

    expect(calls).toEqual([
      ['init', { orgId: 'o-1' }],
      ['start'],
      ['trackEvent', { name: 'page view', properties: {} }],
      ['shutdown'],
    ]);
  });

  it('writes one DEBUG line naming the event and the mapping key for a declared skip', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
    const calls: unknown[][] = [];
    const { elb } = await startFlow({
      logger: { level: 'DEBUG', handler },
      destinations: {
        fullstory: {
          code: {
            ...destinationFullStory,
            env: { fullstory: recordingFS(calls) },
          },
          config: {
            settings: { orgId: 'o-1' },
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: { identify: { map: { uid: 'data.none' } } },
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
        'FullStory skipped setIdentity: identify resolved to nothing',
        expect.objectContaining({ event: 'company update' }),
      ],
    ]);
  });
});
