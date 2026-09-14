import { SettingsSchema, settings } from '../schemas';

describe('Settings schema', () => {
  // Drift gate: a field on the Settings type that is not declared here stays
  // out of the generated JSON Schema, which is what package hints are read from.
  test('declares every settings field', () => {
    expect(Object.keys(SettingsSchema.shape).sort()).toEqual([
      'headers',
      'method',
      'timeout',
      'transform',
      'url',
    ]);
  });

  test('surfaces transform in the generated JSON Schema', () => {
    expect(settings).toMatchObject({
      properties: { transform: expect.anything() },
    });
  });

  test('accepts a transform function', () => {
    const result = SettingsSchema.safeParse({
      url: 'https://api.example.com/',
      transform: () => 'body',
    });

    expect(result.success).toBe(true);
  });
});
