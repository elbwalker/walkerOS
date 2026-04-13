// mixpanel-browser is ESM-style and Jest's CJS transformer can't parse it
// at import time. Tests always wire their own mock via env.mixpanel, so
// the real module is never touched — we stub the import with an empty
// default export to satisfy Jest's loader.
jest.mock('mixpanel-browser', () => ({
  __esModule: true,
  default: {},
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, MixpanelGroup, Settings } from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  if (typeof out[0] === 'string') return [out as CallRecord];
  return out as CallRecord[];
}

/**
 * Replaces every method on the mock env.mixpanel with a spy that appends
 * to a shared `calls` array. Handles the nested `people` namespace and
 * the factory-returning `get_group(key, id)` method specially — a call
 * to `get_group('company', 'acme').set({...})` produces:
 *   ['mixpanel.get_group.set', 'company', 'acme', {...}]
 */
function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const push = (path: string, args: unknown[]) => {
    calls.push([path, ...args]);
  };

  // Group handle factory — each call to get_group returns a handle whose
  // methods record tuples tagged with the key+id.
  const get_group = (groupKey: string, groupId: string): MixpanelGroup => {
    const handle: MixpanelGroup = {
      set: (...args: unknown[]) => {
        push('mixpanel.get_group.set', [groupKey, groupId, ...args]);
      },
      set_once: (...args: unknown[]) => {
        push('mixpanel.get_group.set_once', [groupKey, groupId, ...args]);
      },
      unset: (...args: unknown[]) => {
        push('mixpanel.get_group.unset', [groupKey, groupId, ...args]);
      },
      union: (...args: unknown[]) => {
        push('mixpanel.get_group.union', [groupKey, groupId, ...args]);
      },
      remove: (...args: unknown[]) => {
        push('mixpanel.get_group.remove', [groupKey, groupId, ...args]);
      },
      delete: () => {
        push('mixpanel.get_group.delete', [groupKey, groupId]);
      },
    } as MixpanelGroup;
    // Also record the get_group call itself (filtered out unless an
    // example explicitly expects it).
    push('mixpanel.get_group', [groupKey, groupId]);
    return handle;
  };

  env.mixpanel = {
    init: (...args: unknown[]) => {
      push('mixpanel.init', args);
    },
    track: (event: string, properties?: Record<string, unknown>) => {
      push('mixpanel.track', [event, properties ?? {}]);
    },
    identify: (distinctId?: string) => {
      push('mixpanel.identify', [distinctId]);
    },
    reset: () => {
      push('mixpanel.reset', []);
    },
    set_group: (groupKey: string, groupIds: string | string[]) => {
      push('mixpanel.set_group', [groupKey, groupIds]);
    },
    get_group: get_group as NonNullable<Env['mixpanel']>['get_group'],
    opt_in_tracking: () => {
      push('mixpanel.opt_in_tracking', []);
    },
    opt_out_tracking: () => {
      push('mixpanel.opt_out_tracking', []);
    },
    stop_batch_senders: () => {
      push('mixpanel.stop_batch_senders', []);
    },
    people: {
      set: (props: unknown) => {
        push('mixpanel.people.set', [props]);
      },
      set_once: (props: unknown) => {
        push('mixpanel.people.set_once', [props]);
      },
      increment: (props: unknown) => {
        push('mixpanel.people.increment', [props]);
      },
      append: (props: unknown) => {
        push('mixpanel.people.append', [props]);
      },
      union: (props: unknown) => {
        push('mixpanel.people.union', [props]);
      },
      remove: (props: unknown) => {
        push('mixpanel.people.remove', [props]);
      },
      unset: (props: unknown) => {
        push('mixpanel.people.unset', [props]);
      },
      delete_user: () => {
        push('mixpanel.people.delete_user', []);
      },
    },
  };
  return { env, collected: () => calls };
}

describe('mixpanel destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
      configInclude?: string[];
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: 'test-project',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      await elb(
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

      await elb(
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

    // Drop init + bookkeeping — every example triggers init once; the
    // synthetic 'mixpanel.get_group' marker is also dropped unless an
    // example explicitly expects it.
    const expected = flatten(example.out as ExpectedOut);
    const expectsGetGroupMarker = expected.some(
      ([path]) => path === 'mixpanel.get_group',
    );
    const actual = collected().filter(([path]) => {
      if (path === 'mixpanel.init') return false;
      if (path === 'mixpanel.get_group' && !expectsGetGroupMarker) return false;
      return true;
    });

    expect(actual).toEqual(expected);
  });
});
