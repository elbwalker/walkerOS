import { loadBundleConfig } from '../loader';

describe('loadBundleConfig deferred env by platform', () => {
  it('produces markers for server flows', () => {
    const config = {
      version: 1,
      flows: {
        serverflow: {
          server: {},
          collector: { url: '$env.COLLECTOR_URL' },
          destinations: {
            d: { config: { apiKey: '$env.API_KEY' } },
          },
        },
      },
    };
    const result = loadBundleConfig(config, {
      configPath: './test.json',
    });
    const collector = result.flowConfig.collector as Record<string, unknown>;
    expect(collector.url).toBe('__WALKEROS_ENV:COLLECTOR_URL');
  });

  it('resolves env normally for web flows', () => {
    process.env.WEB_KEY = 'baked-value';
    const config = {
      version: 1,
      flows: {
        webflow: {
          web: {},
          collector: { url: '$env.WEB_KEY' },
          destinations: {},
        },
      },
    };
    const result = loadBundleConfig(config, {
      configPath: './test.json',
    });
    const collector = result.flowConfig.collector as Record<string, unknown>;
    expect(collector.url).toBe('baked-value');
    delete process.env.WEB_KEY;
  });
});
