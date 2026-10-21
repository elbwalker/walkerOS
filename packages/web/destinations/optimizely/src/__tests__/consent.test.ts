import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationOptimizely } from '..';
import type { Env } from '../types';

describe('optimizely destination consent', () => {
  it('tracks again after a revocation and a new grant', async () => {
    const tracked: string[] = [];
    const env: Env = {
      optimizely: {
        createInstance: () => ({
          onReady: () => Promise.resolve({ success: true }),
          createUserContext: () => ({
            trackEvent: (eventKey: string) => {
              tracked.push(eventKey);
            },
            setAttribute: () => undefined,
          }),
          close: () => undefined,
        }),
        createPollingProjectConfigManager: () => ({}),
        createBatchEventProcessor: () => ({}),
      },
    };
    const { elb } = await startFlow({
      destinations: {
        optimizely: {
          code: { ...destinationOptimizely, env },
          config: {
            consent: { analytics: true },
            settings: { sdkKey: 'key', userId: 'user.id' },
          },
        },
      },
    });

    await elb('walker consent', { analytics: true });
    expect((await elb(getEvent('page view'))).ok).toBe(true);
    await elb('walker consent', { analytics: false });
    await elb('walker consent', { analytics: true });
    const after = await elb(getEvent('product view'));

    expect(after.ok).toBe(true);
    expect(after.done?.optimizely).toBeDefined();
    expect(tracked).toEqual(['page view', 'product view']);
  });
});
