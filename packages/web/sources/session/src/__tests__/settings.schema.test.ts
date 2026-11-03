import { SettingsSchema, settings } from '../schemas';
import pkg from '../../package.json';

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

  // The published JSON Schema is closed: a setting the source reads but the
  // schema lacks fails `walkeros validate`.
  test('accepts custom marketing parameters', () => {
    expect(settings).toMatchObject({ properties: { parameters: {} } });
    expect(
      SettingsSchema.strict().safeParse({
        storage: true,
        parameters: { ref: 'referral' },
      }).success,
    ).toBe(true);
  });

  test('describes pulse by what it refreshes', () => {
    expect(settings).toMatchObject({
      properties: {
        pulse: {
          description: expect.stringMatching(
            /^Refresh an existing stored session/,
          ),
        },
      },
    });
  });
});

describe('Package metadata', () => {
  test('links the documentation page with its exact path', () => {
    expect(pkg.walkerOS.docs).toBe(
      'https://www.walkeros.io/docs/sources/web/session',
    );
  });
});
