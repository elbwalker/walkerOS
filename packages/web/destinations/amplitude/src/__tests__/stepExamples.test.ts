// @amplitude/analytics-browser is ESM-style and Jest's CJS transformer
// can't parse it at import time. Tests always wire their own mock via
// env.amplitude, so the real module is never touched — we stub the
// import with an empty namespace to satisfy Jest's loader.
jest.mock('@amplitude/analytics-browser', () => ({
  __esModule: true,
}));
jest.mock('@amplitude/plugin-session-replay-browser', () => ({
  __esModule: true,
  sessionReplayPlugin: () => ({}),
}));
jest.mock('@amplitude/experiment-js-client', () => ({
  __esModule: true,
  Experiment: {
    initializeWithAmplitudeAnalytics: jest.fn(() => ({ stop: jest.fn() })),
  },
}));
jest.mock('@amplitude/engagement-browser', () => ({
  __esModule: true,
  plugin: () => ({}),
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type {
  Env,
  IdentifyInstance,
  RevenueInstance,
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
 * Records a chained Identify instance's operations as a plain-object map
 * that matches the example `out` shape:
 *   { set: { plan: 'premium' }, add: { login_count: 1 } }
 */
class RecordingIdentify implements IdentifyInstance {
  ops: Record<string, Record<string, unknown> | string[] | boolean> = {};
  private ensure<K extends string>(op: K): Record<string, unknown> {
    if (!this.ops[op]) this.ops[op] = {};
    return this.ops[op] as Record<string, unknown>;
  }
  set(p: string, v: unknown) {
    this.ensure('set')[p] = v;
    return this;
  }
  setOnce(p: string, v: unknown) {
    this.ensure('setOnce')[p] = v;
    return this;
  }
  add(p: string, v: number) {
    this.ensure('add')[p] = v;
    return this;
  }
  append(p: string, v: unknown) {
    this.ensure('append')[p] = v;
    return this;
  }
  prepend(p: string, v: unknown) {
    this.ensure('prepend')[p] = v;
    return this;
  }
  preInsert(p: string, v: unknown) {
    this.ensure('preInsert')[p] = v;
    return this;
  }
  postInsert(p: string, v: unknown) {
    this.ensure('postInsert')[p] = v;
    return this;
  }
  remove(p: string, v: unknown) {
    this.ensure('remove')[p] = v;
    return this;
  }
  unset(p: string) {
    if (!this.ops.unset) this.ops.unset = [];
    (this.ops.unset as string[]).push(p);
    return this;
  }
  clearAll() {
    this.ops.clearAll = true;
    return this;
  }
}

/** Same idea for Revenue — records chained setters into a plain object. */
class RecordingRevenue implements RevenueInstance {
  props: Record<string, unknown> = {};
  setProductId(v: string) {
    this.props.productId = v;
    return this;
  }
  setPrice(v: number) {
    this.props.price = v;
    return this;
  }
  setQuantity(v: number) {
    this.props.quantity = v;
    return this;
  }
  setRevenueType(v: string) {
    this.props.revenueType = v;
    return this;
  }
  setCurrency(v: string) {
    this.props.currency = v;
    return this;
  }
  setRevenue(v: number) {
    this.props.revenue = v;
    return this;
  }
  setReceipt(v: string) {
    this.props.receipt = v;
    return this;
  }
  setReceiptSig(v: string) {
    this.props.receiptSig = v;
    return this;
  }
  setEventProperties(v: Record<string, unknown>) {
    this.props.eventProperties = v;
    return this;
  }
}

function spyEnv(env: Env): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  const makeSpy =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([`amplitude.${name}`, ...args]);
    };
  env.amplitude = {
    init: ((_apiKey: string, _opts?: unknown) => ({
      promise: Promise.resolve(),
    })) as NonNullable<Env['amplitude']>['init'],
    track: ((eventType: string, props?: Record<string, unknown>) => {
      calls.push(['amplitude.track', eventType, props ?? {}]);
    }) as NonNullable<Env['amplitude']>['track'],
    identify: ((id: RecordingIdentify) => {
      calls.push(['amplitude.identify', id.ops]);
    }) as NonNullable<Env['amplitude']>['identify'],
    revenue: ((rev: RecordingRevenue) => {
      calls.push(['amplitude.revenue', rev.props]);
    }) as NonNullable<Env['amplitude']>['revenue'],
    reset: (() => {
      calls.push(['amplitude.reset']);
    }) as NonNullable<Env['amplitude']>['reset'],
    setOptOut: makeSpy('setOptOut') as NonNullable<
      Env['amplitude']
    >['setOptOut'],
    setUserId: makeSpy('setUserId') as NonNullable<
      Env['amplitude']
    >['setUserId'],
    setDeviceId: makeSpy('setDeviceId') as NonNullable<
      Env['amplitude']
    >['setDeviceId'],
    setSessionId: makeSpy('setSessionId') as NonNullable<
      Env['amplitude']
    >['setSessionId'],
    setGroup: makeSpy('setGroup') as NonNullable<Env['amplitude']>['setGroup'],
    groupIdentify: ((type: string, name: string, id: RecordingIdentify) => {
      calls.push(['amplitude.groupIdentify', type, name, id.ops]);
    }) as NonNullable<Env['amplitude']>['groupIdentify'],
    flush: () => ({ promise: Promise.resolve() }),
    add: () => ({ promise: Promise.resolve() }),
    Identify: RecordingIdentify as unknown as NonNullable<
      Env['amplitude']
    >['Identify'],
    Revenue: RecordingRevenue as unknown as NonNullable<
      Env['amplitude']
    >['Revenue'],
  };
  return { env, collected: () => calls };
}

describe('amplitude destination — step examples', () => {
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
      // Consent examples need config.consent declared so the destination's
      // on() handler knows which walkerOS consent key to check.
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

    // Drop init — every example triggers init once; it's not part of `out`.
    const expected = flatten(example.out as ExpectedOut);
    const actual = collected().filter(([path]) => path !== 'amplitude.init');

    expect(actual).toEqual(expected);
  });
});
