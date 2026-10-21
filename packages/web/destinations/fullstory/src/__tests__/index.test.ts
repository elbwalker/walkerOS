import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
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
});
