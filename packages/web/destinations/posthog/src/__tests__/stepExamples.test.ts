// posthog-js is ESM-first and Jest's CJS transformer can't parse it at
// import time. Tests always wire their own mock via env.posthog, so the
// real module is never touched — we stub the import with an empty
// namespace to satisfy Jest's loader. This mirrors the clarity test.
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {},
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, PostHogSDK, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const sdk: PostHogSDK = {
    init: ((token: string, config?: unknown) => {
      calls.push(['posthog.init', token, config]);
      return sdk;
    }) as PostHogSDK['init'],
    capture: ((eventName: string, properties?: Record<string, unknown>) => {
      calls.push(['posthog.capture', eventName, properties ?? {}]);
    }) as PostHogSDK['capture'],
    identify: ((
      distinctId?: string,
      userPropertiesToSet?: Record<string, unknown>,
      userPropertiesToSetOnce?: Record<string, unknown>,
    ) => {
      const args: unknown[] = [distinctId];
      if (userPropertiesToSet !== undefined) args.push(userPropertiesToSet);
      if (userPropertiesToSetOnce !== undefined)
        args.push(userPropertiesToSetOnce);
      calls.push(['posthog.identify', ...args]);
    }) as PostHogSDK['identify'],
    setPersonProperties: ((
      userPropertiesToSet?: Record<string, unknown>,
      userPropertiesToSetOnce?: Record<string, unknown>,
    ) => {
      calls.push([
        'posthog.setPersonProperties',
        userPropertiesToSet,
        userPropertiesToSetOnce,
      ]);
    }) as PostHogSDK['setPersonProperties'],
    group: ((
      groupType: string,
      groupKey: string,
      groupPropertiesToSet?: Record<string, unknown>,
    ) => {
      const args: unknown[] = [groupType, groupKey];
      if (groupPropertiesToSet !== undefined) args.push(groupPropertiesToSet);
      calls.push(['posthog.group', ...args]);
    }) as PostHogSDK['group'],
    reset: (() => {
      calls.push(['posthog.reset']);
    }) as PostHogSDK['reset'],
    opt_in_capturing: (() => {
      calls.push(['posthog.opt_in_capturing']);
    }) as PostHogSDK['opt_in_capturing'],
    opt_out_capturing: (() => {
      calls.push(['posthog.opt_out_capturing']);
    }) as PostHogSDK['opt_out_capturing'],
  };
  env.posthog = sdk;
  return { env, collected: () => calls };
}

describe('posthog destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: ReadonlyArray<CallRecord>;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
      configInclude?: string[];
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: 'phc_test',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      // Consent examples need config.consent declared so the destination's
      // on() handler knows which walkerOS consent key to check.
      elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          consent: { analytics: true },
          include: example.configInclude,
          settings: baseSettings,
        },
      );
      await elb('walker consent', example.in as WalkerOS.Consent);
    } else {
      const event = example.in as WalkerOS.Event;
      const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
      const mappingConfig = mapping
        ? { [event.entity]: { [event.action]: mapping } }
        : undefined;

      elb(
        'walker destination',
        { ...dest, env: spiedEnv },
        {
          include: example.configInclude,
          settings: baseSettings,
          mapping: mappingConfig,
        },
      );
      await elb(event);
    }

    // Drop init — every example triggers init once; it's not part of `out`.
    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = collected().filter(([path]) => path !== 'posthog.init');

    expect(actual).toEqual(expected);
  });
});
