import type { AdsSettings, GA4Settings, GTMSettings } from '../types';
import { isObject } from '@walkeros/core';
import {
  AdsSettingsSchema,
  GA4SettingsSchema,
  GTMSettingsSchema,
  SettingsSchema,
  ads,
  ga4,
  gtm,
  mapping,
  settings,
} from '../schemas';

/** The description of a property in a JSON Schema, `a.b` for a nested one. */
function described(schema: unknown, path: string): unknown {
  let node = schema;
  for (const key of path.split('.')) {
    const properties = isObject(node) ? node.properties : undefined;
    node = isObject(properties) ? properties[key] : undefined;
  }
  return isObject(node) ? node.description : undefined;
}

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

  // The container id is appended to `domain`, so it is a URL up to `?id=`;
  // a label alone sends no conversion, the rule needs a name too.
  it.each<[string, unknown, string, RegExp]>([
    ['gtm.domain', gtm, 'domain', /\?id=/],
    ['ga4.pageview', ga4, 'pageview', /send_page_view/],
    ['ads.currency', ads, 'currency', /default: EUR/],
    ['ads.label', mapping, 'ads.label', /name/],
  ])('describes %s as the destination uses it', (_, schema, path, text) => {
    expect(described(schema, path)).toMatch(text);
  });
});
