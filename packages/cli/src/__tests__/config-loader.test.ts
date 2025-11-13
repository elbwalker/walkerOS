/**
 * Config Loader Tests
 *
 * Tests for multi-environment configuration loading.
 */

import {
  loadBundleConfig,
  loadAllEnvironments,
  getAvailableEnvironments,
} from '../bundle/config-loader';

describe('Config Loader', () => {
  // ========================================
  // Single Environment Tests
  // ========================================

  describe('Single Environment Config', () => {
    test('loads single-environment config successfully', () => {
      const config = {
        platform: 'web',
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
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.environment).toBe('default');
      expect(result.isMultiEnvironment).toBe(false);
      expect(result.config.platform).toBe('web');
      expect(result.config.sources).toBeDefined();
    });

    test('applies platform-specific defaults for web', () => {
      const config = {
        platform: 'web' as const,
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.config.build?.platform).toBe('browser');
      expect(result.config.build?.format).toBe('iife');
      expect(result.config.build?.target).toBe('es2020');
      expect(result.config.build?.output).toBe('./dist/walker.js');
    });

    test('applies platform-specific defaults for server', () => {
      const config = {
        platform: 'server' as const,
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.config.build?.platform).toBe('node');
      expect(result.config.build?.format).toBe('esm');
      expect(result.config.build?.target).toBe('node20');
      expect(result.config.build?.output).toBe('./dist/bundle.js');
    });

    test('merges custom build options with defaults', () => {
      const config = {
        platform: 'web' as const,
        build: {
          minify: true,
          format: 'esm' as const,
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.config.build?.minify).toBe(true);
      expect(result.config.build?.format).toBe('esm'); // Custom overrides default
      expect(result.config.build?.target).toBe('es2020'); // Default preserved
    });

    test('auto-selects web template', () => {
      const config = {
        platform: 'web' as const,
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.config.build?.template).toContain('base.hbs');
    });

    test('auto-selects server template', () => {
      const config = {
        platform: 'server' as const,
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.config.build?.template).toContain('server.hbs');
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
          platform: 'web' as const,
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
          platform: 'web' as const,
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
          platform: 'server' as const,
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
      expect(result.config.platform).toBe('web');
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
      expect(results[0].config.platform).toBe('web');
      expect(results[2].config.platform).toBe('server');
    });

    test('throws error if --all used with single-environment config', () => {
      const singleConfig = { platform: 'web' as const };

      expect(() =>
        loadAllEnvironments(singleConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow('--all flag requires a multi-environment configuration');
    });

    test('gets available environments from multi-env config', () => {
      const environments = getAvailableEnvironments(multiEnvConfig);

      expect(environments).toEqual(['web_prod', 'web_stage', 'server_prod']);
    });

    test('returns empty array for single-env config', () => {
      const singleConfig = { platform: 'web' as const };
      const environments = getAvailableEnvironments(singleConfig);

      expect(environments).toEqual([]);
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================

  describe('Error Handling', () => {
    test('throws detailed error for invalid config format', () => {
      const invalidConfig = {
        platform: 'invalid',
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow('Invalid configuration format');
    });

    test('throws error for missing required fields', () => {
      const invalidConfig = {};

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow();
    });

    test('throws error for invalid version in multi-env config', () => {
      const invalidConfig = {
        version: 2,
        environments: {
          prod: { platform: 'web' },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
          environment: 'prod',
        }),
      ).toThrow();
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
          prod: { platform: 'web' as const },
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

    test('logs warning for ignored --env flag on single-env config', () => {
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      };

      const config = {
        platform: 'web' as const,
      };

      loadBundleConfig(config, {
        configPath: '/test/config.json',
        environment: 'ignored',
        logger,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('configuration is single-environment'),
      );
    });
  });

  // ========================================
  // Real-World Scenario Tests
  // ========================================

  describe('Real-World Scenarios', () => {
    test('loads complex multi-environment setup', () => {
      const complexConfig = {
        version: 1,
        $schema: 'https://walkeros.io/schema/flow/v1.json',
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
            platform: 'web' as const,
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
            build: {
              minify: true,
              sourcemap: false,
              output: './dist/walker.min.js',
            },
          },
        },
      };

      const result = loadBundleConfig(complexConfig, {
        configPath: '/test/config.json',
        environment: 'web_production',
      });

      expect(result.config.platform).toBe('web');
      expect((result.config.sources as any)?.browser?.package).toBe(
        '@walkeros/web-source-browser@2.0.0',
      );
      expect(result.config.build?.minify).toBe(true);
      expect(result.config.build?.output).toBe('./dist/walker.min.js');
    });
  });
});
