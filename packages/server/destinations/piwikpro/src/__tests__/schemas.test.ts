import { isObject } from '@walkeros/core';
import { hints } from '../hints';
import { MappingSchema, SettingsSchema, settings } from '../schemas';

const base = { url: 'https://acc.piwik.pro/', appId: 'site-1' };

describe('schemas', () => {
  it.each([
    ['a number', { goalValue: 10 }],
    ['a map', { goalValue: { map: { a: 'data.x' } } }],
    ['a set', { goalValue: { set: ['data.x', 'data.y'] } }],
    ['a dimension set', { customDimensions: { '1': { set: ['data.x'] } } }],
  ])('MappingSchema accepts %s', (_, mapping) => {
    expect(MappingSchema.safeParse(mapping).success).toBe(true);
  });

  it.each([
    ['an input switched off', { ip: false }],
    ['a fallback chain', { pageViewId: ['event.data.pv', 'ingest.pv'] }],
  ])('SettingsSchema accepts %s', (_, settings) => {
    expect(SettingsSchema.safeParse({ ...base, ...settings }).success).toBe(
      true,
    );
  });

  it('identified texts say one config.consent state lets events pass', () => {
    const properties = settings.properties;
    const identified =
      isObject(properties) && isObject(properties.identified)
        ? properties.identified.description
        : undefined;

    for (const text of [identified, hints['identified-consent'].text]) {
      expect(text).toMatch(/only one/);
      expect(text).not.toMatch(/never reach/);
    }
  });

  it('pageUrl and batch texts say an unsendable event fails', () => {
    const properties = settings.properties;
    const pageUrl =
      isObject(properties) && isObject(properties.pageUrl)
        ? properties.pageUrl.description
        : undefined;

    for (const text of [pageUrl, hints['batch-size'].text]) {
      expect(text).toMatch(/missing-input/);
      expect(text).not.toMatch(/skipped/i);
    }
  });

  it('rejects a dimension key that is not a bare id', () => {
    expect(
      SettingsSchema.safeParse({
        ...base,
        customDimensions: { dimension1: 'data.x' },
      }).success,
    ).toBe(false);
  });
});
