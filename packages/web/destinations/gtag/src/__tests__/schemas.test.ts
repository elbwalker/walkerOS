import type { AdsSettings, GA4Settings, GTMSettings } from '../types';
import {
  AdsSettingsSchema,
  GA4SettingsSchema,
  GTMSettingsSchema,
  SettingsSchema,
  settings,
} from '../schemas';

/**
 * Every settings key of the types, listed once. The compiler rejects a missing
 * or an unknown key, so a new setting cannot skip its schema entry.
 */
const ga4Keys: Record<keyof GA4Settings, true> = {
  measurementId: true,
  debug: true,
  init: true,
  pageview: true,
  scriptSrc: true,
  server_container_url: true,
  snakeCase: true,
  transport_url: true,
  data: true,
};
const adsKeys: Record<keyof AdsSettings, true> = {
  conversionId: true,
  currency: true,
  enhancedConversions: true,
  data: true,
};
const gtmKeys: Record<keyof GTMSettings, true> = {
  containerId: true,
  dataLayer: true,
  domain: true,
  data: true,
};

const sorted = (record: object) => Object.keys(record).sort();

describe('settings schema', () => {
  it('accepts a first-party scriptSrc and init: false', () => {
    const ga4 = {
      measurementId: 'G-XXXXXXXXXX',
      init: false,
      scriptSrc: 'https://example.com/metrics/tag_serving_path/',
    };
    const result = SettingsSchema.safeParse({ ga4 });
    expect(result.error?.issues).toBeUndefined();
    // An unknown key would be stripped, so the parsed value proves both known.
    expect(result.data?.ga4).toEqual(ga4);
  });

  it('lists scriptSrc and init in the JSON Schema that validate checks', () => {
    expect(settings).toMatchObject({
      properties: {
        ga4: {
          properties: {
            init: { type: 'boolean' },
            scriptSrc: { type: 'string' },
          },
        },
      },
    });
  });

  it('covers every GA4, Ads and GTM setting of the types', () => {
    expect(sorted(GA4SettingsSchema.shape)).toEqual(sorted(ga4Keys));
    expect(sorted(AdsSettingsSchema.shape)).toEqual(sorted(adsKeys));
    expect(sorted(GTMSettingsSchema.shape)).toEqual(sorted(gtmKeys));
  });
});
