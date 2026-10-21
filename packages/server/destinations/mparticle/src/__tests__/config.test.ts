import { getConfig } from '../config';

describe('getConfig', () => {
  test('throws when apiKey is missing', () => {
    expect(() => getConfig({})).toThrow(
      'Config settings apiKey, apiSecret missing',
    );
  });

  test('throws when apiSecret is missing', () => {
    expect(() => getConfig({ settings: { apiKey: 'key' } })).toThrow(
      'Config settings apiSecret missing',
    );
  });

  test('applies defaults for pod and environment', () => {
    const config = getConfig({
      settings: { apiKey: 'key', apiSecret: 'secret' },
    });
    expect(config.settings).toEqual({
      apiKey: 'key',
      apiSecret: 'secret',
      pod: 'us1',
      environment: 'production',
    });
  });

  test('preserves custom pod and environment', () => {
    const config = getConfig({
      settings: {
        apiKey: 'key',
        apiSecret: 'secret',
        pod: 'eu1',
        environment: 'development',
      },
    });
    expect(config.settings.pod).toBe('eu1');
    expect(config.settings.environment).toBe('development');
  });
});
