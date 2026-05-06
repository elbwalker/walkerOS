/**
 * Config Loader Tests
 *
 * Tests for Flow.Json configuration loading with the new format.
 */

import {
  loadBundleConfig,
  loadAllFlows,
  getAvailableFlows,
} from '../../../config/index.js';

describe('Config Loader', () => {
  // ========================================
  // Single Flow (Flow.Json with one flow)
  // ========================================

  describe('Single Flow (Flow.Json)', () => {
    test('loads Flow.Json with single flow automatically', () => {
      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'web',
              bundle: {
                packages: {
                  '@walkeros/core': { imports: ['getId'] },
                },
              },
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

      expect(result.flowName).toBe('default');
      expect(result.isMultiFlow).toBe(false);
      expect(result.flowSettings.config?.platform).toBe('web');
      expect(result.flowSettings.sources).toBeDefined();
    });

    test('applies platform-specific defaults for web', () => {
      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'web',
              bundle: { packages: {} },
            },
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
      // Output path is static (relative to cwd)
      expect(result.buildOptions.output).toBe('./dist/walker.js');
    });

    test('applies platform-specific defaults for server', () => {
      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'server',
              bundle: { packages: {} },
            },
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
      // Output path is static (relative to cwd)
      expect(result.buildOptions.output).toBe('./dist/bundle.mjs');
    });

    test('extracts packages from flowSettings', () => {
      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'web',
              bundle: {
                packages: {
                  '@walkeros/core': { imports: ['getId', 'clone'] },
                  '@walkeros/destination-demo': {
                    imports: ['destinationDemo'],
                  },
                },
              },
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

    test('extracts overrides from bundle.overrides', () => {
      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'web',
              bundle: {
                packages: { '@walkeros/core': {} },
                overrides: {
                  '@amplitude/analytics-types': '2.11.1',
                },
              },
            },
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      expect(result.buildOptions.overrides).toEqual({
        '@amplitude/analytics-types': '2.11.1',
      });
    });

    test('respects build overrides from CLI', () => {
      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'web',
              bundle: { packages: {} },
            },
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
  // Multi-Flow Tests
  // ========================================

  describe('Multi-Flow Config', () => {
    const multiFlowConfig = {
      version: 4,
      flows: {
        web_prod: {
          config: {
            platform: 'web',
            bundle: { packages: {} },
          },
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
          config: {
            platform: 'web',
            bundle: { packages: {} },
          },
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
          config: {
            platform: 'server',
            bundle: { packages: {} },
          },
          destinations: {
            api: {
              package: '@walkeros/server-destination-api',
            },
          },
        },
      },
    };

    test('loads specific flow from multi-flow config', () => {
      const result = loadBundleConfig(multiFlowConfig, {
        configPath: '/test/config.json',
        flowName: 'web_prod',
      });

      expect(result.flowName).toBe('web_prod');
      expect(result.isMultiFlow).toBe(true);
      expect(result.availableFlows).toEqual([
        'web_prod',
        'web_stage',
        'server_prod',
      ]);
      expect(result.flowSettings.config?.platform).toBe('web');
    });

    test('throws error if flow not specified for multi-flow config', () => {
      expect(() =>
        loadBundleConfig(multiFlowConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow('Please specify a flow using --flow flag');
    });

    test('throws error if specified flow not found', () => {
      expect(() =>
        loadBundleConfig(multiFlowConfig, {
          configPath: '/test/config.json',
          flowName: 'nonexistent',
        }),
      ).toThrow('Flow "nonexistent" not found');
    });

    test('loads all flows', () => {
      const results = loadAllFlows(multiFlowConfig, {
        configPath: '/test/config.json',
      });

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.flowName)).toEqual([
        'web_prod',
        'web_stage',
        'server_prod',
      ]);
      expect(results[0].flowSettings.config?.platform).toBe('web');
      expect(results[2].flowSettings.config?.platform).toBe('server');
    });

    test('gets available flows from multi-flow config', () => {
      const flows = getAvailableFlows(multiFlowConfig);

      expect(flows).toEqual(['web_prod', 'web_stage', 'server_prod']);
    });
  });

  // ========================================
  // Error Handling Tests
  // ========================================

  describe('Error Handling', () => {
    test('throws error for invalid config format (missing version)', () => {
      const invalidConfig = {
        flows: {
          default: { config: { platform: 'web' } },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration/);
    });

    test('throws error for invalid config format (wrong version)', () => {
      const invalidConfig = {
        version: 99,
        flows: {
          default: { config: { platform: 'web' } },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration/);
    });

    test('throws error for invalid config format (missing flows)', () => {
      const invalidConfig = {
        version: 4,
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration/);
    });

    test('throws error for empty flows', () => {
      const invalidConfig = {
        version: 4,
        flows: {},
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/at least one flow/i);
    });

    test('throws error for flow without config.platform', () => {
      const invalidConfig = {
        version: 4,
        flows: {
          default: {
            config: { bundle: { packages: {} } },
          },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/platform/i);
    });

    test('returns empty array for non-Flow.Json config', () => {
      const oldFormatConfig = {
        flow: { platform: 'web' },
        build: { packages: {} },
      };
      const flows = getAvailableFlows(oldFormatConfig);

      expect(flows).toEqual([]);
    });
  });

  // ========================================
  // Logger Integration Tests
  // ========================================

  describe('Logger Integration', () => {
    test('logs info message for multi-flow config', () => {
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      };

      const config = {
        version: 4,
        flows: {
          prod: {
            config: {
              platform: 'web',
              bundle: { packages: {} },
            },
          },
          stage: {
            config: {
              platform: 'web',
              bundle: { packages: {} },
            },
          },
        },
      };

      loadBundleConfig(config, {
        configPath: '/test/config.json',
        flowName: 'prod',
        logger,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Using flow: prod'),
      );
    });

    test('does not log for single-flow config', () => {
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
      };

      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'web',
              bundle: { packages: {} },
            },
          },
        },
      };

      loadBundleConfig(config, {
        configPath: '/test/config.json',
        logger,
      });

      // Should not log flow selection for single-flow
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // Real-World Scenario Tests
  // ========================================

  describe('Real-World Scenarios', () => {
    test('loads complex multi-flow setup', () => {
      const complexConfig = {
        version: 4,
        variables: {
          CURRENCY: 'USD',
          base_mapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
          web_production: {
            config: {
              platform: 'web',
              bundle: {
                packages: {
                  '@walkeros/collector': { imports: ['startFlow'] },
                  '@walkeros/web-source-browser': {
                    imports: ['sourceBrowser'],
                  },
                  '@walkeros/web-destination-gtag': {
                    imports: ['destinationGtag'],
                  },
                },
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
            },
          },
        },
      };

      const result = loadBundleConfig(complexConfig, {
        configPath: '/test/config.json',
        flowName: 'web_production',
      });

      expect(result.flowSettings.config?.platform).toBe('web');
      expect(result.flowSettings.sources?.browser?.package).toBe(
        '@walkeros/web-source-browser@2.0.0',
      );
      expect(result.buildOptions.minify).toBe(true);
      // Output is static (relative to cwd)
      expect(result.buildOptions.output).toBe('./dist/walker.js');
    });

    test('extracts windowCollector and windowElb from config.settings', () => {
      const config = {
        version: 4,
        flows: {
          default: {
            config: {
              platform: 'web',
              settings: {
                windowCollector: 'myCollector',
                windowElb: 'myElb',
              },
              bundle: { packages: {} },
            },
          },
        },
      };

      const result = loadBundleConfig(config, {
        configPath: '/test/config.json',
      });

      // Web settings live under config.settings in v4
      const settings = result.flowSettings.config?.settings as
        | { windowCollector?: string; windowElb?: string }
        | undefined;
      expect(settings?.windowCollector).toBe('myCollector');
      expect(settings?.windowElb).toBe('myElb');
    });
  });
});
