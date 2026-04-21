jest.mock('@amplitude/analytics-node', () => ({
  __esModule: true,
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
  EventOptions,
} from '../types';

type CallRecord = [string, ...unknown[]];

/** Records Identify operations as a plain object for assertion matching. */
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

/** Records Revenue chained setters into a plain object. */
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
  env.amplitude = {
    init: ((_apiKey: string, _opts?: unknown) => ({
      promise: Promise.resolve(),
    })) as NonNullable<Env['amplitude']>['init'],
    track: ((
      eventType: string,
      props?: Record<string, unknown>,
      eventOpts?: EventOptions,
    ) => {
      const call: CallRecord = ['amplitude.track', eventType, props ?? {}];
      if (eventOpts && Object.keys(eventOpts).length > 0) call.push(eventOpts);
      calls.push(call);
    }) as NonNullable<Env['amplitude']>['track'],
    identify: ((id: RecordingIdentify, eventOpts?: EventOptions) => {
      const call: CallRecord = ['amplitude.identify', id.ops];
      if (eventOpts && Object.keys(eventOpts).length > 0) call.push(eventOpts);
      calls.push(call);
    }) as NonNullable<Env['amplitude']>['identify'],
    revenue: ((rev: RecordingRevenue, eventOpts?: EventOptions) => {
      const call: CallRecord = ['amplitude.revenue', rev.props];
      if (eventOpts && Object.keys(eventOpts).length > 0) call.push(eventOpts);
      calls.push(call);
    }) as NonNullable<Env['amplitude']>['revenue'],
    setOptOut: ((...args: unknown[]) => {
      calls.push(['amplitude.setOptOut', ...args]);
    }) as NonNullable<Env['amplitude']>['setOptOut'],
    setGroup: ((
      type: string,
      name: string | string[],
      eventOpts?: EventOptions,
    ) => {
      const call: CallRecord = ['amplitude.setGroup', type, name];
      if (eventOpts && Object.keys(eventOpts).length > 0) call.push(eventOpts);
      calls.push(call);
    }) as NonNullable<Env['amplitude']>['setGroup'],
    groupIdentify: ((
      type: string,
      name: string,
      id: RecordingIdentify,
      eventOpts?: EventOptions,
    ) => {
      const call: CallRecord = ['amplitude.groupIdentify', type, name, id.ops];
      if (eventOpts && Object.keys(eventOpts).length > 0) call.push(eventOpts);
      calls.push(call);
    }) as NonNullable<Env['amplitude']>['groupIdentify'],
    flush: () => ({ promise: Promise.resolve() }),
    Identify: RecordingIdentify as unknown as NonNullable<
      Env['amplitude']
    >['Identify'],
    Revenue: RecordingRevenue as unknown as NonNullable<
      Env['amplitude']
    >['Revenue'],
  };
  return { env, collected: () => calls };
}

describe('amplitude server destination -- step examples', () => {
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

    const actual = collected().filter(([path]) => path !== 'amplitude.init');

    expect(actual).toEqual(example.out);
  });
});
