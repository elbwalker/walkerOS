import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from '../schemas/settings';

describe('validate SettingsSchema', () => {
  it('parses a full valid settings object', () => {
    const result = SettingsSchema.safeParse({
      contract: [{ events: { page: { view: { type: 'object' } } } }],
      format: true,
      mode: 'strict',
      output: { isValid: 'source.valid', errors: 'validation' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown mode value', () => {
    const result = SettingsSchema.safeParse({ mode: 'drop' });
    expect(result.success).toBe(false);
  });

  it('parses an empty object (all fields optional)', () => {
    const result = SettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('exposes the four top-level keys in the generated JSON Schema', () => {
    const jsonSchema = zodToSchema(SettingsSchema);
    const { properties } = jsonSchema;
    if (typeof properties !== 'object' || properties === null) {
      throw new Error('expected generated schema to have an object properties');
    }
    expect(Object.keys(properties).sort()).toEqual([
      'contract',
      'format',
      'mode',
      'output',
    ]);
  });
});
