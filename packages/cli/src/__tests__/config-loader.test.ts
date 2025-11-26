/**
 * Config Loader Tests
 *
 * Tests for Flow.Setup configuration loading with the new format.
 */

import {
  loadBundleConfig,
  loadAllEnvironments,
  getAvailableEnvironments,
} from '../config/index.js';

describe('Config Loader', () => {
  // ========================================
  // Single Environment (Flow.Setup with one env)
  // ========================================

  describe('Single Environment (Flow.Setup)', () => {
    test('loads Flow.Setup with single environment automatically', () => {
      const config = {
        version: 1,
        environments: {
          default: {
            web: {},
            packages: {
              '@walkeros/core': { imports: ['getId'] },
            },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser',
              },
            },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag',
                config: {
                  settings: { ga4: { measurementId: 'G-123' } },
                },
              },
            },
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.environment).toBe('default');
      expect(result.isMultiEnvironment).toBe(false);
      expect(result.flowConfig.web).toBeDefined();
      expect(result.flowConfig.sources).toBeDefined();
    });

    test('applies platform-specific defaults for web', () => {
      const config = {
        version: 1,
        environments: {
          default: {
            web: {},
            packages: {},
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.platform).toBe('browser');
      expect(result.buildOptions.format).toBe('iife');
      expect(result.buildOptions.target).toBe('es2020');
      expect(result.buildOptions.minify).toBe(true);
      expect(result.buildOptions.template).toBe('web.hbs');
      // Output path is resolved relative to config file directory
      expect(result.buildOptions.output).toBe('/test/dist/walker.js');
    });

    test('applies platform-specific defaults for server', () => {
      const config = {
        version: 1,
        environments: {
          default: {
            server: {},
            packages: {},
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.platform).toBe('node');
      expect(result.buildOptions.format).toBe('esm');
      expect(result.buildOptions.target).toBe('node20');
      expect(result.buildOptions.minify).toBe(true);
      expect(result.buildOptions.template).toBe('server.hbs');
      // Output path is resolved relative to config file directory
      expect(result.buildOptions.output).toBe('/test/dist/bundle.mjs');
    });

    test('extracts packages from flowConfig', () => {
      const config = {
        version: 1,
        environments: {
          default: {
            web: {},
            packages: {
              '@walkeros/core': { imports: ['getId', 'clone'] },
              '@walkeros/destination-demo': { imports: ['destinationDemo'] },
            },
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.packages).toEqual({
        '@walkeros/core': { imports: ['getId', 'clone'] },
        '@walkeros/destination-demo': { imports: ['destinationDemo'] },
      });
    });

    test('respects build overrides from CLI', () => {
      const config = {
        version: 1,
        environments: {
          default: {
            web: {},
            packages: {},
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
        buildOverrides: {
          minify: false,
          output: '/custom/output.js',
        },
      });

      expect(result.buildOptions.minify).toBe(false);
      expect(result.buildOptions.output).toBe('/custom/output.js');
    });
  });

  // ========================================
  // Multi-Environment Tests
  // ========================================

  describe('Multi-Environment Config', () => {
    const multiEnvConfig = {
      version: 1,
      environments: {
        web_prod: {
          web: {},
          packages: {},
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
            },
          },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              config: { settings: { ga4: { measurementId: 'G-PROD' } } },
            },
          },
        },
        web_stage: {
          web: {},
          packages: {},
          sources: {
            browser: {
              package: '@walkeros/web-source-browser',
            },
          },
          destinations: {
            gtag: {
              package: '@walkeros/web-destination-gtag',
              config: { settings: { ga4: { measurementId: 'G-STAGE' } } },
            },
          },
        },
        server_prod: {
          server: {},
          packages: {},
          destinations: {
            api: {
              package: '@walkeros/server-destination-api',
            },
          },
        },
      },
    };

    test('loads specific environment from multi-environment config', () => {
      const result = loadBundleConfig(multiEnvConfig, {
        configPath: '/test/config.json',
        environment: 'web_prod',
      });

      expect(result.environment).toBe('web_prod');
      expect(result.isMultiEnvironment).toBe(true);
      expect(result.availableEnvironments).toEqual([
        'web_prod',
        'web_stage',
        'server_prod',
      ]);
      expect(result.flowConfig.web).toBeDefined();
    });

    test('throws error if environment not specified for multi-env config', () => {
      expect(() =>
        loadBundleConfig(multiEnvConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow('Please specify an environment using --env flag');
    });

    test('throws error if specified environment not found', () => {
      expect(() =>
        loadBundleConfig(multiEnvConfig, {
          configPath: '/test/config.json',
          environment: 'nonexistent',
        }),
      ).toThrow('Environment "nonexistent" not found');
    });

    test('loads all environments', () => {
      const results = loadAllEnvironments(multiEnvConfig, {
        configPath: '/test/config.json',
      });

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.environment)).toEqual([
        'web_prod',
        'web_stage',
        'server_prod',
      ]);
      expect(results[0].flowConfig.web).toBeDefined();
      expect(results[2].flowConfig.server).toBeDefined();
    });

    test('gets available environments from multi-env config', () => {
      const environments = getAvailableEnvironments(multiEnvConfig);

      expect(environments).toEqual(['web_prod', 'web_stage', 'server_prod']);
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================

  describe('Error Handling', () => {
    test('throws error for invalid config format (missing version)', () => {
      const invalidConfig = {
        environments: {
          default: { web: {} },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration.*version/);
    });

    test('throws error for invalid config format (wrong version)', () => {
      const invalidConfig = {
        version: 2,
        environments: {
          default: { web: {} },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration.*version/);
    });

    test('throws error for invalid config format (missing environments)', () => {
      const invalidConfig = {
        version: 1,
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration.*environments/);
    });

    test('throws error for empty environments', () => {
      const invalidConfig = {
        version: 1,
        environments: {},
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/must contain at least one environment/);
    });

    test('throws error for environment without web/server key', () => {
      const invalidConfig = {
        version: 1,
        environments: {
          default: {
            packages: {},
          },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/must have a "web" or "server" key/);
    });

    test('returns empty array for non-Flow.Setup config', () => {
      const oldFormatConfig = {
        flow: { platform: 'web' },
        build: { packages: {} },
      };
      const environments = getAvailableEnvironments(oldFormatConfig);

      expect(environments).toEqual([]);
    });
  });

  // ========================================
  // Logger Integration Tests
  // ========================================

  describe('Logger Integration', () => {
    test('logs info message for multi-environment config', () => {
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      };

      const config = {
        version: 1,
        environments: {
          prod: {
            web: {},
            packages: {},
          },
          stage: {
            web: {},
            packages: {},
          },
        },
      };

      loadBundleConfig(config, {
        configPath: '/test/config.json',
        environment: 'prod',
        logger,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Using environment: prod'),
      );
    });

    test('does not log for single-environment config', () => {
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      };

      const config = {
        version: 1,
        environments: {
          default: {
            web: {},
            packages: {},
          },
        },
      };

      loadBundleConfig(config, {
        configPath: '/test/config.json',
        logger,
      });

      // Should not log environment selection for single-env
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Real-World Scenario Tests
  // ========================================

  describe('Real-World Scenarios', () => {
    test('loads complex multi-environment setup', () => {
      const complexConfig = {
        version: 1,
        variables: {
          CURRENCY: 'USD',
        },
        definitions: {
          base_mapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        environments: {
          web_production: {
            web: {},
            packages: {
              '@walkeros/collector': { imports: ['startFlow'] },
              '@walkeros/web-source-browser': { imports: ['sourceBrowser'] },
              '@walkeros/web-destination-gtag': {
                imports: ['destinationGtag'],
              },
            },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser@2.0.0',
                config: {
                  settings: { pageview: true },
                },
                primary: true,
              },
            },
            destinations: {
              gtag: {
                package: '@walkeros/web-destination-gtag@2.0.0',
                config: {
                  settings: { ga4: { measurementId: 'G-PROD' } },
                },
              },
            },
            collector: {
              run: true,
              tagging: 1,
            },
          },
        },
      };

      const result = loadBundleConfig(complexConfig, {
        configPath: '/test/config.json',
        environment: 'web_production',
      });

      expect(result.flowConfig.web).toBeDefined();
      expect(result.flowConfig.sources?.browser?.package).toBe(
        '@walkeros/web-source-browser@2.0.0',
      );
      expect(result.buildOptions.minify).toBe(true);
      // Output uses convention default
      expect(result.buildOptions.output).toBe('/test/dist/walker.js');
    });

    test('extracts windowCollector and windowElb from web config', () => {
      const config = {
        version: 1,
        environments: {
          default: {
            web: {
              windowCollector: 'myCollector',
              windowElb: 'myElb',
            },
            packages: {},
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      // Web config values should be in flowConfig
      expect(
        (result.flowConfig.web as { windowCollector?: string }).windowCollector,
      ).toBe('myCollector');
      expect((result.flowConfig.web as { windowElb?: string }).windowElb).toBe(
        'myElb',
      );
    });
  });
});
