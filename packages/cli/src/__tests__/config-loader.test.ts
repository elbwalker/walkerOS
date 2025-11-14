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
        flow: {
          platform: 'web' as const,
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
        build: {
          packages: {},
          code: 'export {};',
          output: './dist/test.js',
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.environment).toBe('default');
      expect(result.isMultiEnvironment).toBe(false);
      expect(
        (result.flowConfig as unknown as { platform: string }).platform,
      ).toBe('web');
      expect(
        (result.flowConfig as unknown as { sources: unknown }).sources,
      ).toBeDefined();
    });

    test('applies platform-specific defaults for web', () => {
      const config = {
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {},
          code: 'export {};',
          output: '',
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.platform).toBe('browser');
      expect(result.buildOptions.format).toBe('iife');
      expect(result.buildOptions.target).toBe('es2020');
      expect(result.buildOptions.output).toBe('./dist/walker.js');
    });

    test('applies platform-specific defaults for server', () => {
      const config = {
        flow: {
          platform: 'server' as const,
        },
        build: {
          packages: {},
          code: 'export {};',
          output: '',
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.platform).toBe('node');
      expect(result.buildOptions.format).toBe('esm');
      expect(result.buildOptions.target).toBe('node20');
      expect(result.buildOptions.output).toBe('./dist/bundle.js');
    });

    test('merges custom build options with defaults', () => {
      const config = {
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {},
          code: 'export {};',
          output: '',
          minify: true,
          format: 'esm' as const,
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.minify).toBe(true);
      expect(result.buildOptions.format).toBe('esm'); // Custom overrides default
      expect(result.buildOptions.target).toBe('es2020'); // Default preserved
    });

    test('does not auto-select templates', () => {
      const config = {
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {},
          code: 'export {};',
          output: '',
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.template).toBeUndefined();
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
          flow: {
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
          build: {
            packages: {},
            code: 'export {};',
            output: './dist/prod.js',
          },
        },
        web_stage: {
          flow: {
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
          build: {
            packages: {},
            code: 'export {};',
            output: './dist/stage.js',
          },
        },
        server_prod: {
          flow: {
            platform: 'server' as const,
            destinations: {
              api: {
                package: '@walkeros/server-destination-api',
              },
            },
          },
          build: {
            packages: {},
            code: 'export {};',
            output: './dist/server.js',
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
      expect(
        (result.flowConfig as unknown as { platform: string }).platform,
      ).toBe('web');
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
      expect(
        (results[0].flowConfig as unknown as { platform: string }).platform,
      ).toBe('web');
      expect(
        (results[2].flowConfig as unknown as { platform: string }).platform,
      ).toBe('server');
    });

    test('throws error if --all used with single-environment config', () => {
      const singleConfig = {
        flow: { platform: 'web' as const },
        build: { packages: {}, code: 'export {};', output: '' },
      };

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
      const singleConfig = {
        flow: { platform: 'web' as const },
        build: { packages: {}, code: 'export {};', output: '' },
      };
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
        flow: {
          platform: 'invalid',
        },
        build: { packages: {}, code: 'export {};', output: '' },
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
          prod: {
            flow: { platform: 'web' as const },
            build: { packages: {}, code: 'export {};', output: '' },
          },
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
          prod: {
            flow: { platform: 'web' as const },
            build: { packages: {}, code: 'export {};', output: '' },
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

    test('logs warning for ignored --env flag on single-env config', () => {
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      };

      const config = {
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {},
          code: 'export {};',
          output: '',
        },
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
            flow: {
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
            },
            build: {
              packages: {},
              code: 'export {};',
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

      expect(
        (result.flowConfig as unknown as { platform: string }).platform,
      ).toBe('web');
      expect(
        (
          result.flowConfig as unknown as {
            sources?: Record<string, { package?: string }>;
          }
        ).sources?.browser?.package,
      ).toBe('@walkeros/web-source-browser@2.0.0');
      expect(result.buildOptions.minify).toBe(true);
      expect(result.buildOptions.output).toBe('./dist/walker.min.js');
    });
  });
});
