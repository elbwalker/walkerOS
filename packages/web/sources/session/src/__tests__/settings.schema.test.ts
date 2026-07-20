import { SettingsSchema } from '../schemas';

describe('Settings schema', () => {
  test('accepts cookie storage with a domain', () => {
    const result = SettingsSchema.safeParse({
      storage: true,
      sessionStorage: 'cookie',
      deviceStorage: 'cookie',
      domain: 'example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('example.com');
    }
  });

  test('rejects unknown storage types', () => {
    expect(
      SettingsSchema.safeParse({ sessionStorage: 'indexeddb' }).success,
    ).toBe(false);
  });
});
