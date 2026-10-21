import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { destinationClarity } from '..';
import type { ClaritySDK } from '../types';

function recordingClarity(calls: unknown[][]): ClaritySDK {
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  return {
    init: record('init'),
    identify: record('identify'),
    setTag: record('setTag'),
    event: record('event'),
    consentV2: record('consentV2'),
    upgrade: record('upgrade'),
  };
}

describe('clarity destination', () => {
  it('passes a revocation to Clarity without settings.consent when the destination is consent-gated', async () => {
    const calls: unknown[][] = [];
    const { elb } = await startFlow({
      destinations: {
        clarity: {
          code: {
            ...destinationClarity,
            env: { clarity: recordingClarity(calls) },
          },
          config: {
            consent: { marketing: true },
            settings: { apiKey: 'gated' },
          },
        },
      },
    });

    await elb('walker consent', { marketing: true });
    await elb(getEvent('page view'));
    await elb('walker consent', { marketing: false });

    expect(calls).toEqual([
      ['init', 'gated'],
      ['consentV2', { analytics_Storage: 'granted', ad_Storage: 'granted' }],
      ['event', 'page view'],
      ['consentV2', { analytics_Storage: 'denied', ad_Storage: 'denied' }],
    ]);
  });

  it('fails pushes with vendor-not-loaded once the Clarity script failed to load', async () => {
    const { elb } = await startFlow({
      destinations: {
        clarity: {
          code: destinationClarity,
          config: { settings: { apiKey: 'blocked' } },
        },
      },
    });

    expect((await elb(getEvent('page view'))).ok).toBe(true);
    const script = document.querySelector(
      'script[src="https://www.clarity.ms/tag/blocked?ref=npm"]',
    );
    expect(script?.hasAttribute('data-walkeros-vendor')).toBe(true);
    script?.dispatchEvent(new Event('error'));

    const result = await elb(getEvent('product view'));
    expect(result.ok).toBe(false);
    expect(result.failed?.clarity?.reason).toMatchObject({
      code: 'vendor-not-loaded',
    });
  });
});
