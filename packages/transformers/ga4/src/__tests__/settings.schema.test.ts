import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from '../schemas/settings';
import type { GA4Settings } from '../types';

describe('ga4 SettingsSchema', () => {
  it('parses a full valid settings object', () => {
    const result = SettingsSchema.safeParse({
      mapping: { page_view: { name: 'page open' } },
      tidPattern: '^(G|AW|DC)-',
      maxEvents: 50,
    });
    expect(result.success).toBe(true);
  });

  it('parses an empty object (all fields optional)', () => {
    expect(SettingsSchema.safeParse({}).success).toBe(true);
  });

  it.each([0, 1.5])('rejects maxEvents %s', (maxEvents) => {
    expect(SettingsSchema.safeParse({ maxEvents }).success).toBe(false);
  });

  it('exposes exactly the GA4Settings keys in the generated JSON Schema', () => {
    // Type-checked drift guard: adding or removing a GA4Settings key fails
    // compilation here until the schema is updated to match.
    const keys: Record<keyof GA4Settings, true> = {
      mapping: true,
      tidPattern: true,
      maxEvents: true,
    };
    const { properties } = zodToSchema(SettingsSchema);
    if (typeof properties !== 'object' || properties === null) {
      throw new Error('expected generated schema to have an object properties');
    }
    expect(Object.keys(properties).sort()).toEqual(Object.keys(keys).sort());
  });
});
