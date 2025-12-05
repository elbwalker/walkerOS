/**
 * Config Loader Tests
 *
 * Tests for Flow.Setup configuration loading with the new format.
 */

import {
  loadBundleConfig,
  loadAllFlows,
  getAvailableFlows,
} from '../config/index.js';

describe('Config Loader', () => {
  // ========================================
  // Single Flow (Flow.Setup with one flow)
  // ========================================

  describe('Single Flow (Flow.Setup)', () => {
    test('loads Flow.Setup with single flow automatically', () => {
      const config = {
        version: 1,
        flows: {
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

      expect(result.flowName).toBe('default');
      expect(result.isMultiFlow).toBe(false);
      expect(result.flowConfig.web).toBeDefined();
      expect(result.flowConfig.sources).toBeDefined();
    });

    test('applies platform-specific defaults for web', () => {
      const config = {
        version: 1,
        flows: {
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
      // Output path is resolved relative to config file directory
      expect(result.buildOptions.output).toBe('/test/dist/walker.js');
    });

    test('applies platform-specific defaults for server', () => {
      const config = {
        version: 1,
        flows: {
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
      // Output path is resolved relative to config file directory
      expect(result.buildOptions.output).toBe('/test/dist/bundle.mjs');
    });

    test('extracts packages from flowConfig', () => {
      const config = {
        version: 1,
        flows: {
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
        flows: {
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
  // Multi-Flow Tests
  // ========================================

  describe('Multi-Flow Config', () => {
    const multiFlowConfig = {
      version: 1,
      flows: {
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
      expect(result.flowConfig.web).toBeDefined();
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
      expect(results[0].flowConfig.web).toBeDefined();
      expect(results[2].flowConfig.server).toBeDefined();
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
          default: { web: {} },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration[\s\S]*version/);
    });

    test('throws error for invalid config format (wrong version)', () => {
      const invalidConfig = {
        version: 2,
        flows: {
          default: { web: {} },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration[\s\S]*version/);
    });

    test('throws error for invalid config format (missing flows)', () => {
      const invalidConfig = {
        version: 1,
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/Invalid configuration[\s\S]*flows/);
    });

    test('throws error for empty flows', () => {
      const invalidConfig = {
        version: 1,
        flows: {},
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/at least one flow/i);
    });

    test('throws error for flow without web/server key', () => {
      const invalidConfig = {
        version: 1,
        flows: {
          default: {
            packages: {},
          },
        },
      };

      expect(() =>
        loadBundleConfig(invalidConfig, {
          configPath: '/test/config.json',
        }),
      ).toThrow(/web.*or.*server|Exactly one of/i);
    });

    test('returns empty array for non-Flow.Setup config', () => {
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
        version: 1,
        flows: {
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
        version: 1,
        flows: {
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
        version: 1,
        variables: {
          CURRENCY: 'USD',
        },
        definitions: {
          base_mapping: {
            page: { view: { name: 'page_view' } },
          },
        },
        flows: {
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
        flowName: 'web_production',
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
        flows: {
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
