import type { Destination, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import { resetConsentState } from '../index';

const INIT_DATE_MS = 1700000000000;
import { resetLoadedScripts } from '../shared/gtag';

type CallRecord = [string, ...unknown[]];

const ga4Init = examples.step.ga4Init;
const adsInit = examples.step.adsInit;
const gtmInit = examples.step.gtmInit;

const ga4InitIn = ga4Init.in as Destination.Config;
const adsInitIn = adsInit.in as Destination.Config;
const gtmInitIn = gtmInit.in as Destination.Config;

const ga4InitOut = (ga4Init.out ?? []) as ReadonlyArray<CallRecord>;
const adsInitOut = (adsInit.out ?? []) as ReadonlyArray<CallRecord>;
const gtmInitOut = (gtmInit.out ?? []) as ReadonlyArray<CallRecord>;

const noopLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  throw: (msg: string) => {
    throw new Error(msg);
  },
} as unknown as Destination.Context['logger'];

type TestEnv = ReturnType<typeof clone> & {
  window: { gtag: jest.Mock; dataLayer: unknown[] };
};

function makeTestEnv(): {
  env: TestEnv;
  mockGtag: jest.Mock;
  calls: CallRecord[];
} {
  const calls: CallRecord[] = [];
  const env = clone(examples.env.push) as TestEnv;
  const mockGtag = jest.fn((...args: unknown[]) => {
    calls.push(['gtag', ...args] as CallRecord);
  });
  env.window.gtag = mockGtag;

  const dataLayerProxy = new Proxy([] as unknown[], {
    set(target, prop, value) {
      target[prop as unknown as number] = value;
      if (prop !== 'length' && typeof prop === 'string') {
        const idx = Number(prop);
        if (!Number.isNaN(idx)) {
          calls.push(['dataLayer.push', value] as CallRecord);
        }
      }
      return true;
    },
  });
  env.window.dataLayer = dataLayerProxy;

  return { env, mockGtag, calls };
}

describe('gtag web destination -- step examples', () => {
  beforeEach(() => {
    resetConsentState();
    resetLoadedScripts();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(INIT_DATE_MS));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const initNames = new Set(['ga4Init', 'adsInit', 'gtmInit']);

  it('ga4Init', async () => {
    const { env, calls } = makeTestEnv();
    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'gtag',
      config: ga4InitIn,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(calls).toEqual(ga4InitOut);
  });

  it('adsInit', async () => {
    const { env, calls } = makeTestEnv();
    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'gtag',
      config: adsInitIn,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(calls).toEqual(adsInitOut);
  });

  it('gtmInit', async () => {
    const { env, calls } = makeTestEnv();
    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'gtag',
      config: gtmInitIn,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(calls).toEqual(gtmInitOut);
  });

  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => !initNames.has(name),
  );

  it.each(stepEntries)('%s', async (_name, example) => {
    const mapping = example.mapping as Record<string, unknown> | undefined;
    const mappingSettings = (mapping?.settings || {}) as Record<
      string,
      unknown
    >;

    const { env, calls } = makeTestEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    // Command examples: route `in` through elb('walker <command>', in).
    if (example.command) {
      // Bootstrap with ga4 init so the tool is registered.
      await elb('walker destination', { ...dest, env }, ga4InitIn);

      const cmd = `walker ${example.command}` as 'walker consent';
      await elb(cmd, example.in as WalkerOS.Consent);

      const actual = calls.slice(ga4InitOut.length);
      expect(actual).toEqual(example.out);
      return;
    }

    // Pick the init config that matches which tool(s) this mapping targets.
    // Default to ga4 when no mapping.settings is specified.
    let bootstrapConfig: Destination.Config;
    let bootstrapOut: ReadonlyArray<CallRecord>;
    if (
      !mapping?.settings ||
      mappingSettings.ga4 !== undefined ||
      (!mappingSettings.ads && !mappingSettings.gtm)
    ) {
      // GA4 is active. Build a composite bootstrap if ads/gtm also needed.
      if (mappingSettings.ads || mappingSettings.gtm) {
        const composite: Destination.Config = {
          settings: {
            ...((ga4InitIn.settings || {}) as Record<string, unknown>),
            ...(mappingSettings.ads
              ? { ads: { conversionId: 'AW-123456789', currency: 'EUR' } }
              : {}),
            ...(mappingSettings.gtm
              ? { gtm: { containerId: 'GTM-XXXXXXX' } }
              : {}),
          },
        };
        bootstrapConfig = composite;
        bootstrapOut = [
          ...ga4InitOut,
          ...(mappingSettings.ads ? adsInitOut : []),
          ...(mappingSettings.gtm ? gtmInitOut : []),
        ];
      } else {
        bootstrapConfig = ga4InitIn;
        bootstrapOut = ga4InitOut;
      }
    } else if (mappingSettings.ads && !mappingSettings.gtm) {
      bootstrapConfig = adsInitIn;
      bootstrapOut = adsInitOut;
    } else if (mappingSettings.gtm && !mappingSettings.ads) {
      bootstrapConfig = gtmInitIn;
      bootstrapOut = gtmInitOut;
    } else {
      // ads + gtm together
      bootstrapConfig = {
        settings: {
          ads: { conversionId: 'AW-123456789', currency: 'EUR' },
          gtm: { containerId: 'GTM-XXXXXXX' },
        },
      };
      bootstrapOut = [...adsInitOut, ...gtmInitOut];
    }

    const event = example.in as WalkerOS.Event;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env },
      { ...bootstrapConfig, mapping: mappingConfig },
    );

    await elb(event);

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = calls.slice(bootstrapOut.length);
    expect(actual).toEqual(expected);
  });
});
