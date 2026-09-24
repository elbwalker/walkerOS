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

describe('loadBundleConfig web $env build environment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SHELL_ID: 'from-shell', KEK: 'secret' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function webConfig(bundleEnv?: Record<string, string>) {
    return {
      version: 4,
      flows: {
        web: {
          config: {
            platform: 'web',
            ...(bundleEnv ? { bundle: { env: bundleEnv } } : {}),
          },
          destinations: {
            d: {
              package: '@walkeros/web-destination-gtag',
              config: {
                declared: '$env.GA4_ID:unset',
                shell: '$env.SHELL_ID:unset',
                kek: '$env.KEK:unset',
              },
            },
          },
        },
      },
    };
  }

  it('local default layers config.bundle.env over process.env', () => {
    const result = loadBundleConfig(
      webConfig({ GA4_ID: 'G-DECLARED', SHELL_ID: 'from-config' }),
      { configPath: './test.json' },
    );
    expect(result.flowSettings.destinations?.d.config).toEqual({
      declared: 'G-DECLARED',
      shell: 'from-config',
      kek: 'secret',
    });
  });

  it('hosted build ({} base) resolves against config.bundle.env alone', () => {
    const result = loadBundleConfig(webConfig({ GA4_ID: 'G-DECLARED' }), {
      configPath: './test.json',
      buildEnv: {},
    });
    expect(result.flowSettings.destinations?.d.config).toEqual({
      declared: 'G-DECLARED',
      shell: 'unset',
      kek: 'unset',
    });
  });

  it('declared values win over an explicit base', () => {
    const result = loadBundleConfig(webConfig({ GA4_ID: 'G-DECLARED' }), {
      configPath: './test.json',
      buildEnv: { GA4_ID: 'G-BASE', SHELL_ID: 'from-base' },
    });
    expect(result.flowSettings.destinations?.d.config).toEqual({
      declared: 'G-DECLARED',
      shell: 'from-base',
      kek: 'unset',
    });
  });

  it('server flows keep $env deferred to runtime regardless of bundle.env', () => {
    const result = loadBundleConfig(
      {
        version: 4,
        flows: {
          server: {
            config: { platform: 'server', bundle: { env: { KEY: 'x' } } },
            destinations: {
              d: {
                package: '@walkeros/server-destination-api',
                config: { key: '$env.KEY' },
              },
            },
          },
        },
      },
      { configPath: './test.json', buildEnv: {} },
    );
    expect(result.flowSettings.destinations?.d.config).toEqual({
      key: '__WALKEROS_ENV:KEY',
    });
  });
});

describe('loadBundleConfig local paths (plain walkeros bundle)', () => {
  it('keeps bundle.packages path and local step packages for laptop builds', () => {
    const result = loadBundleConfig(
      {
        version: 4,
        flows: {
          s: {
            config: {
              platform: 'server',
              bundle: { packages: { '@walkeros/x': { path: '../x' } } },
            },
            destinations: { d: { package: './my-dest' } },
          },
        },
      },
      { configPath: './test.json' },
    );
    expect(result.buildOptions.packages['@walkeros/x']).toEqual({
      path: '../x',
    });
    expect(result.flowSettings.destinations?.d.package).toBe('./my-dest');
  });
});

describe('loadBundleConfig config.bundle.env must be literal', () => {
  it.each([
    '$env.KEK',
    '$var.id',
    '$secret.TOKEN',
    '$flow.other.url',
    '$contract.web',
    '$code:() => 1',
    '__WALKEROS_ENV:KEK',
    'G-$var.id',
  ])('refuses %s, naming the key only', (value) => {
    expect(() =>
      loadBundleConfig(
        {
          version: 4,
          variables: { id: 'x' },
          flows: {
            web: {
              config: { platform: 'web', bundle: { env: { GA4_ID: value } } },
            },
          },
        },
        { configPath: './test.json', buildEnv: {} },
      ),
    ).toThrow(
      'config.bundle.env values must be literal strings; references are not allowed in: GA4_ID',
    );
  });
});
