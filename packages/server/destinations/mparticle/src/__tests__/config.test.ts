import { createMockLogger } from '@walkeros/core';
import { getConfig } from '../config';

describe('getConfig', () => {
  test('throws when apiKey is missing', () => {
    expect(() => getConfig({}, createMockLogger())).toThrow(
      'Config settings apiKey missing',
    );
  });

  test('throws when apiSecret is missing', () => {
    expect(() =>
      getConfig({ settings: { apiKey: 'key' } }, createMockLogger()),
    ).toThrow('Config settings apiSecret missing');
  });

  test('applies defaults for pod and environment', () => {
    const config = getConfig(
      { settings: { apiKey: 'key', apiSecret: 'secret' } },
      createMockLogger(),
    );
    expect(config.settings).toEqual({
      apiKey: 'key',
      apiSecret: 'secret',
      pod: 'us1',
      environment: 'production',
    });
  });

  test('preserves custom pod and environment', () => {
    const config = getConfig(
      {
        settings: {
          apiKey: 'key',
          apiSecret: 'secret',
          pod: 'eu1',
          environment: 'development',
        },
      },
      createMockLogger(),
    );
    expect(config.settings.pod).toBe('eu1');
    expect(config.settings.environment).toBe('development');
  });
});
