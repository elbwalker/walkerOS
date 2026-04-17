jest.mock('@optimizely/optimizely-sdk', () => ({
  __esModule: true,
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Env, OptimizelyUserContext, Settings } from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  if (typeof out[0] === 'string') return [out as CallRecord];
  return out as CallRecord[];
}

/**
 * Builds a recording Env where SDK methods append to a shared call log.
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const mockUserContext: OptimizelyUserContext = {
    trackEvent: (eventKey: string, eventTags?: Record<string, unknown>) => {
      calls.push(['optimizely.trackEvent', eventKey, eventTags ?? {}]);
    },
    setAttribute: (key: string, value: unknown) => {
      calls.push(['optimizely.setAttribute', key, value]);
    },
  };

  const env: Env = {
    optimizely: {
      createInstance: () => ({
        onReady: () => Promise.resolve({ success: true }),
        createUserContext: () => mockUserContext,
        close: () => {
          calls.push(['optimizely.close']);
        },
      }),
      createPollingProjectConfigManager: () => ({}),
      createBatchEventProcessor: () => ({}),
    },
  };

  return { env, collected: () => calls };
}

describe('optimizely destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
    };

    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { sdkKey: string } = {
      sdkKey: 'test-sdk-key',
      userId: 'user.id',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      await elb(
        'walker destination',
        { ...dest, env },
        {
          consent: { analytics: true },
          settings: baseSettings,
        },
      );
      // Prime the destination so init runs and state.client exists before
      // consent revocation fires on('consent').
      await elb({
        entity: 'ping',
        action: 'init',
        data: { id: 'prime' },
      } as unknown as WalkerOS.PartialEvent);
      await elb('walker consent', { analytics: true } as WalkerOS.Consent);
      // Reset the call log so only the post-consent behavior is asserted.
      collected().length = 0;
      await elb('walker consent', example.in as WalkerOS.Consent);
    } else {
      const event = example.in as WalkerOS.Event;
      const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
      const mappingConfig = mapping
        ? { [event.entity]: { [event.action]: mapping } }
        : undefined;

      await elb(
        'walker destination',
        { ...dest, env },
        {
          settings: baseSettings,
          mapping: mappingConfig,
        },
      );
      await elb(event);
    }

    const expected = flatten(example.out as ExpectedOut);
    const actual = collected();

    expect(actual).toEqual(expected);
  });
});
