import { MappingSchema, SettingsSchema } from '../schemas';

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

  it('rejects a dimension key that is not a bare id', () => {
    expect(
      SettingsSchema.safeParse({
        ...base,
        customDimensions: { dimension1: 'data.x' },
      }).success,
    ).toBe(false);
  });
});
