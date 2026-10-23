import type { Flow, StandardEventName } from '@walkeros/core';
import path from 'path';
import { startFlow } from '@walkeros/collector';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { clone, createLogger, observeEnv } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { page } from '@walkeros/web-core/dev';
import type { Config, Settings } from '../types';
import { destinationGtag, resetConsentState } from '..';
import { examples, schemas } from '../dev';
import { SettingsSchema } from '../schemas';

const CLAIMS: StandardEventName[] = [
  'page view',
  'product view',
  'product add',
  'order complete',
];

const GA4 = {
  ga4: { measurementId: 'G-XXXXXXXXXX', pageview: false },
} satisfies Settings;
const ADS = {
  ads: { conversionId: 'AW-123456789', currency: 'EUR' },
} satisfies Settings;
const GTM = { gtm: { containerId: 'GTM-XXXXXXX' } } satisfies Settings;

const env = { push: examples.env.push, simulation: examples.env.simulation };

// Init examples run below, the rest by the tool settings they need.
const {
  ga4Init,
  adsInit,
  gtmInit,
  consentModeV2,
  consentRevoke,
  googleAdsConversion,
  adsEnhancedConversions,
  gtmDataLayerPush,
  multipleToolsSimultaneous,
  ...ga4Events
} = examples.step;

describe('gtag conformance', () => {
  beforeEach(() => {
    resetConsentState();
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('destination', destinationGtag, {
      profile: 'vendor-global',
      page,
      examples: examples.step,
      schema: schemas.settings,
      settings: { ga4: { measurementId: 'G-XXXXXX-1' } },
      env,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('maps the claimed standard events to GA4', async () => {
    await runExamples('destination', destinationGtag, ga4Events, {
      settings: GA4,
      env,
      page,
      claims: CLAIMS,
      published: true,
    });
  });

  // One run each: Consent Mode keeps its default state per page.
  it.each<[string, Record<string, unknown>, Flow.StepExamples]>([
    ['consent mode', GA4, { consentModeV2 }],
    ['consent revoke', GA4, { consentRevoke }],
    ['Google Ads', ADS, { googleAdsConversion }],
    [
      'enhanced conversions',
      {
        ads: {
          ...ADS.ads,
          enhancedConversions: {
            email: 'data.customerEmail',
            phone_number: 'data.customerPhone',
          },
        },
      },
      { adsEnhancedConversions },
    ],
    ['GTM', GTM, { gtmDataLayerPush }],
    ['all tools', { ...GA4, ...ADS, ...GTM }, { multipleToolsSimultaneous }],
  ])('runs the %s examples', async (_, settings, group) => {
    await runExamples('destination', destinationGtag, group, {
      settings,
      env,
      page,
      published: true,
    });
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});

// The runner keeps init calls out of every out, so the init examples run here.
describe('gtag init examples', () => {
  beforeEach(() => {
    resetConsentState();
    jest.useFakeTimers();
    jest.setSystemTime(1700000000000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each<[string, Flow.StepExample, Config]>([
    ['ga4Init', ga4Init, { settings: GA4 }],
    ['adsInit', adsInit, { settings: ADS }],
    ['gtmInit', gtmInit, { loadScript: true, settings: GTM }],
  ])('%s', async (_, example, config) => {
    expect(example.in).toEqual(config);
    expect(SettingsSchema.safeParse(config.settings).error).toBeUndefined();

    const observed = observeEnv(
      clone(examples.env.push),
      examples.env.simulation,
    );
    const { collector } = await startFlow();
    await destinationGtag.init?.({
      id: 'gtag',
      config,
      env: observed.env,
      logger: createLogger(),
      collector,
    });

    expect(observed.calls.map(({ fn, args }) => [fn, ...args])).toEqual(
      example.out,
    );
  });
});
