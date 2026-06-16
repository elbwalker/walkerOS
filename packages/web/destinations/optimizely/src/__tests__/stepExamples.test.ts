jest.mock('@optimizely/optimizely-sdk', () => ({
  __esModule: true,
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { OptimizelyStepExample } from '../examples/step';
import type { Env, OptimizelyUserContext, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

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
  it.each<[string, OptimizelyStepExample]>(Object.entries(examples.step))(
    '%s',
    async (name, example) => {
      const { env, collected } = spyEnv();
      const dest = jest.requireActual('../').default;
      const { elb } = await startFlow();

      const baseSettings: Partial<Settings> & { sdkKey: string } = {
        sdkKey: 'test-sdk-key',
        userId: 'user.id',
        ...(example.settings || {}),
      };

      if (example.command === 'consent') {
        await elb('walker destination', {
          code: { ...dest, env },
          config: {
            consent: { analytics: true },
            settings: baseSettings,
          },
        });
        // Load the gated destination under a prior grant first when the example
        // declares one, so a revoke acts on an already-granted destination.
        if (example.before) await elb('walker consent', example.before);
        await elb('walker consent', example.in as WalkerOS.Consent);
      } else {
        const event = example.in as WalkerOS.Event;
        const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
        const mappingConfig = mapping
          ? { [event.entity]: { [event.action]: mapping } }
          : undefined;

        await elb('walker destination', {
          code: { ...dest, env },
          config: {
            settings: baseSettings,
            mapping: mappingConfig,
          },
        });
        await elb(event);
      }

      const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
      const actual = collected();

      expect(actual).toEqual(expected);
    },
  );
});
