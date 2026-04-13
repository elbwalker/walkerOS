import type { Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type {
  Env,
  MixpanelCallback,
  MixpanelClient,
  Mapping,
  Settings,
} from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  if (typeof out[0] === 'string') return [out as CallRecord];
  return out as CallRecord[];
}

/**
 * Replaces every method on the mock env.Mixpanel with a spy that appends
 * to a shared `calls` array. The factory `init()` is also spied — call
 * records are prefixed with `mp.`.
 *
 * Server SDK differences from web:
 * - people.* methods take `distinct_id` as first arg
 * - groups.* methods take `(groupKey, groupId)` as first two args
 * - No get_group() — groups is a direct namespace on the client
 */
function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const push = (path: string, args: unknown[]) => {
    calls.push([path, ...args]);
  };

  // The init factory returns a spied client
  env.Mixpanel = {
    init: (...initArgs: unknown[]): MixpanelClient => {
      push('Mixpanel.init', initArgs);

      const client: MixpanelClient = {
        track: (
          eventName: string,
          properties: Record<string, unknown>,
          cb?: MixpanelCallback,
        ) => {
          push('mp.track', [eventName, properties]);
          cb?.(undefined);
        },
        import: (
          eventName: string,
          time: Date | number,
          properties?: Record<string, unknown>,
          cb?: MixpanelCallback,
        ) => {
          push('mp.import', [eventName, time, properties ?? {}]);
          cb?.(undefined);
        },
        alias: (distinctId: string, alias: string, cb?: MixpanelCallback) => {
          push('mp.alias', [distinctId, alias]);
          cb?.(undefined);
        },
        people: {
          set: (
            distinctId: string,
            props: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.people.set', [distinctId, props]);
            cb?.(undefined);
          },
          set_once: (
            distinctId: string,
            props: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.people.set_once', [distinctId, props]);
            cb?.(undefined);
          },
          increment: (
            distinctId: string,
            props: Record<string, number>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.people.increment', [distinctId, props]);
            cb?.(undefined);
          },
          append: (
            distinctId: string,
            props: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.people.append', [distinctId, props]);
            cb?.(undefined);
          },
          union: (
            distinctId: string,
            data: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.people.union', [distinctId, data]);
            cb?.(undefined);
          },
          remove: (
            distinctId: string,
            data: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.people.remove', [distinctId, data]);
            cb?.(undefined);
          },
          unset: (
            distinctId: string,
            prop: string | string[],
            cb?: MixpanelCallback,
          ) => {
            push('mp.people.unset', [distinctId, prop]);
            cb?.(undefined);
          },
          delete_user: (distinctId: string, cb?: MixpanelCallback) => {
            push('mp.people.delete_user', [distinctId]);
            cb?.(undefined);
          },
        },
        groups: {
          set: (
            gk: string,
            gi: string,
            props: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.groups.set', [gk, gi, props]);
            cb?.(undefined);
          },
          set_once: (
            gk: string,
            gi: string,
            props: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.groups.set_once', [gk, gi, props]);
            cb?.(undefined);
          },
          union: (
            gk: string,
            gi: string,
            data: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.groups.union', [gk, gi, data]);
            cb?.(undefined);
          },
          remove: (
            gk: string,
            gi: string,
            data: Record<string, unknown>,
            cb?: MixpanelCallback,
          ) => {
            push('mp.groups.remove', [gk, gi, data]);
            cb?.(undefined);
          },
          unset: (
            gk: string,
            gi: string,
            prop: string | string[],
            cb?: MixpanelCallback,
          ) => {
            push('mp.groups.unset', [gk, gi, prop]);
            cb?.(undefined);
          },
          delete_group: (gk: string, gi: string, cb?: MixpanelCallback) => {
            push('mp.groups.delete_group', [gk, gi]);
            cb?.(undefined);
          },
        },
      };
      return client;
    },
  };

  return { env, collected: () => calls };
}

describe('mixpanel server destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      settings?: Partial<Settings>;
      configInclude?: string[];
    };

    const env = clone(examples.env.push) as Env;
    const { env: spiedEnv, collected } = spyEnv(env);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dest = require('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: 'test-project-token',
      ...(example.settings || {}),
    };

    const event = example.in as Record<string, unknown>;
    const mapping = example.mapping as
      | WalkerOSMapping.Rule<Mapping>
      | undefined;
    const mappingConfig:
      | WalkerOSMapping.Rules<WalkerOSMapping.Rule<Mapping>>
      | undefined = mapping
      ? {
          [(event as { entity?: string }).entity || '']: {
            [(event as { action?: string }).action || '']: mapping,
          },
        }
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

    // Drop Mixpanel.init — every example triggers init once.
    const expected = flatten(example.out as ExpectedOut);
    const actual = collected().filter(([path]) => {
      if (path === 'Mixpanel.init') return false;
      return true;
    });

    expect(actual).toEqual(expected);
  });
});
