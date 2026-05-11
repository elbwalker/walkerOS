import { loadBundleConfig } from '../loader';

interface MockLogger {
  warn: jest.Mock<void, [string]>;
  info: jest.Mock<void, [string]>;
}

function mockLogger(): MockLogger {
  return {
    warn: jest.fn<void, [string]>(),
    info: jest.fn<void, [string]>(),
  };
}

describe('loadBundleConfig flow.config.bundle.{packages,overrides,traceInclude}', () => {
  it('reads packages from flow.config.bundle.packages', () => {
    const config = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: {
              packages: {
                '@walkeros/server-source-express': { version: '^4.0.1' },
              },
            },
          },
        },
      },
    };
    const result = loadBundleConfig(config, { configPath: './test.json' });
    expect(
      result.buildOptions.packages['@walkeros/server-source-express'],
    ).toEqual({ version: '^4.0.1' });
  });

  it('reads overrides from flow.config.bundle.overrides', () => {
    const config = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: { overrides: { '@grpc/grpc-js': '1.10.x' } },
          },
        },
      },
    };
    const result = loadBundleConfig(config, { configPath: './test.json' });
    expect(result.buildOptions.overrides).toEqual({
      '@grpc/grpc-js': '1.10.x',
    });
  });

  it('reads traceInclude from flow.config.bundle.traceInclude', () => {
    const config = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: {
              traceInclude: [
                './extra-asset.json',
                'node_modules/foo/runtime/*.js',
              ],
            },
          },
        },
      },
    };
    const result = loadBundleConfig(config, { configPath: './test.json' });
    expect(result.buildOptions.traceInclude).toEqual([
      './extra-asset.json',
      'node_modules/foo/runtime/*.js',
    ]);
  });

  it('warns and strips flow.config.bundle.external (no longer supported)', () => {
    const logger = mockLogger();
    const config = {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: { external: ['foo'] },
          },
        },
      },
    };
    const result = loadBundleConfig(config, {
      configPath: './test.json',
      logger,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'flow.config.bundle.external is no longer supported',
      ),
    );
    // Field is intentionally not threaded through anywhere.
    expect(result.buildOptions.packages).toEqual({});
  });
});

describe('loadBundleConfig deferred env by platform', () => {
  it('produces markers for server flows', () => {
    const config = {
      version: 4,
      flows: {
        serverflow: {
          config: { platform: 'server' },
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
    const collector = result.flowSettings.collector as Record<string, unknown>;
    expect(collector.url).toBe('__WALKEROS_ENV:COLLECTOR_URL');
  });

  it('resolves env normally for web flows', () => {
    process.env.WEB_KEY = 'baked-value';
    const config = {
      version: 4,
      flows: {
        webflow: {
          config: { platform: 'web' },
          collector: { url: '$env.WEB_KEY' },
          destinations: {},
        },
      },
    };
    const result = loadBundleConfig(config, {
      configPath: './test.json',
    });
    const collector = result.flowSettings.collector as Record<string, unknown>;
    expect(collector.url).toBe('baked-value');
    delete process.env.WEB_KEY;
  });
});
