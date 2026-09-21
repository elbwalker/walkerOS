import { SettingsSchema, settings } from '../schemas';
import type { Settings } from '../types';

describe('Settings schema', () => {
  test('documents every setting the source reads', () => {
    const keys: Array<keyof Settings> = [
      'categoryMap',
      'explicitOnly',
      'apiVersion',
      'v3EventName',
    ];
    const properties = settings.properties;
    expect(
      properties && typeof properties === 'object'
        ? Object.keys(properties).sort()
        : [],
    ).toEqual([...keys].sort());
  });

  test('keeps apiVersion and v3EventName', () => {
    const result = SettingsSchema.safeParse({
      apiVersion: 'v3',
      v3EventName: 'UC_UI_CMP_EVENT',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        apiVersion: 'v3',
        v3EventName: 'UC_UI_CMP_EVENT',
      });
    }
  });

  test('rejects an unknown apiVersion', () => {
    expect(SettingsSchema.safeParse({ apiVersion: 'v4' }).success).toBe(false);
  });
});
