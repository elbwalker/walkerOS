import { startFlow } from '@walkeros/collector';
import type { Logger } from '@walkeros/core';
import { createEvent, getEvent, Level } from '@walkeros/core';
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
      ['consentV2', { analytics_Storage: 'granted' }],
      ['event', 'page view'],
      ['consentV2', { analytics_Storage: 'denied', ad_Storage: 'denied' }],
    ]);
  });

  it('never grants ad storage from an analytics-only grant without settings.consent', async () => {
    const calls: unknown[][] = [];
    const { elb } = await startFlow({
      destinations: {
        clarity: {
          code: {
            ...destinationClarity,
            env: { clarity: recordingClarity(calls) },
          },
          config: {
            consent: { analytics: true, marketing: true },
            settings: { apiKey: 'analytics-only' },
          },
        },
      },
    });

    await elb('walker consent', { analytics: true, marketing: false });
    await elb(getEvent('page view'));
    await elb('walker consent', { analytics: true });

    const consentCalls = calls.filter(([name]) => name === 'consentV2');
    expect(consentCalls.length).toBeGreaterThan(0);
    for (const [, v2] of consentCalls)
      expect(v2).not.toMatchObject({ ad_Storage: 'granted' });
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

  it('writes one DEBUG line naming the event and the mapping key for a declared skip', async () => {
    const lines: Array<[Level, string, unknown]> = [];
    const handler: Logger.Handler = (level, message, context) => {
      lines.push([level, message, context]);
    };
    const calls: unknown[][] = [];
    const { elb } = await startFlow({
      logger: { level: 'DEBUG', handler },
      destinations: {
        clarity: {
          code: {
            ...destinationClarity,
            env: { clarity: recordingClarity(calls) },
          },
          config: {
            settings: { apiKey: 'key' },
            mapping: {
              company: {
                update: {
                  silent: true,
                  settings: { set: { map: { page_id: 'data.none' } } },
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
        'Clarity skipped setTag: set resolved to nothing',
        expect.objectContaining({ event: 'company update' }),
      ],
    ]);
  });
});
