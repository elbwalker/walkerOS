import type { Destination, WalkerOS } from '@walkeros/core';
import type { D8aFn, InstallD8aOptions, InstallD8aResult } from '@d8a-tech/wt';
import { startFlow } from '@walkeros/collector';
import { examples } from './dev';
import { resetConsentState } from './index';
import type { Env } from './types';

const INIT_DATE_MS = 1700000000000;

type CallRecord = [string, ...unknown[]];

const initExample = examples.step.init;
const initIn = initExample.in as Destination.Config;
const initOut = (initExample.out ?? []) as ReadonlyArray<CallRecord>;

const noopLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  throw: (msg: string) => {
    throw new Error(msg);
  },
} as unknown as Destination.Context['logger'];

function createInstallD8a(calls: CallRecord[]): Env['installD8a'] {
  return (opts?: InstallD8aOptions): InstallD8aResult => {
    const windowRef = opts?.windowRef as Env['window'];
    const globalName = opts?.globalName || 'd8a';
    const dataLayerName = opts?.dataLayerName || 'd8aLayer';
    const d8a = jest.fn((...args: unknown[]) => {
      calls.push(['d8a', ...args]);
    }) as unknown as D8aFn;

    d8a.js = jest.fn();
    d8a.config = jest.fn();
    d8a.event = jest.fn();
    d8a.set = jest.fn();
    d8a.consent = jest.fn();

    windowRef[dataLayerName] = windowRef[dataLayerName] || [];
    windowRef[globalName] = d8a;

    return {
      dataLayerName,
      globalName,
      consumer: {
        start: () => {},
        stop: () => {},
        getState: () => ({}),
        setOnEvent: () => {},
        setOnConfig: () => {},
      },
      dispatcher: {
        enqueueEvent: () => {},
        flush: async () => ({ sent: 0 }),
        flushNow: async () => ({ sent: 0 }),
        attachLifecycleFlush: () => {},
      },
    };
  };
}

function makeTestEnv(): { env: Env; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  return {
    calls,
    env: {
      installD8a: createInstallD8a(calls),
      window: {},
    },
  };
}

describe('d8a web destination -- step examples', () => {
  beforeEach(() => {
    resetConsentState();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(INIT_DATE_MS));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('init', async () => {
    const { env, calls } = makeTestEnv();
    const dest = jest.requireActual('./').default;

    await dest.init({
      id: 'd8a',
      config: initIn,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(calls).toEqual(initOut);
  });

  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it.each(stepEntries)('%s', async (_name, example) => {
    const { env, calls } = makeTestEnv();
    const dest = jest.requireActual('./').default;
    const { elb } = await startFlow();

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping
      ? { [event.entity]: { [event.action]: example.mapping } }
      : undefined;

    await elb('walker destination', { ...dest, env }, { ...initIn, mapping });

    if (example.command) {
      const cmd = `walker ${example.command}` as 'walker consent';
      await elb(cmd, example.in as WalkerOS.Consent);
    } else {
      await elb(event);
    }

    const actual = calls.slice(initOut.length);
    expect(actual).toEqual(example.out);
  });
});
