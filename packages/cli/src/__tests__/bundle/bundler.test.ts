import fs from 'fs-extra';
import path from 'path';
import {
  bundleCore as bundle,
  buildConfigObject,
  generatePlatformWrapper,
  createEntryPoint,
  detectTransformerPackages,
  detectExplicitCodeImports,
} from '../../commands/bundle/bundler.js';
import { loadBundleConfig } from '../../config/index.js';
import { createLogger, type Logger } from '../../core/index.js';
import { getId, type Flow } from '@walkeros/core';
import type { BuildOptions } from '../../types/bundle.js';

// No mocks - test with real package downloads and bundling

/**
 * Helper to create a Flow.Setup config for testing.
 */
function createFlowSetup(
  platform: 'web' | 'server',
  packages: Flow.Packages,
): Flow.Setup {
  return {
    version: 1,
    flows: {
      default: {
        ...(platform === 'web' ? { web: {} } : { server: {} }),
        packages,
      },
    },
  };
}

/**
 * Helper to create build options for testing.
 * Uses minimal defaults with test-specific overrides.
 */
function createBuildOptions(
  overrides: Partial<BuildOptions> & { output: string },
): BuildOptions {
  return {
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: false,
    sourcemap: false,
    cache: true,
    packages: {},
    code: '',
    ...overrides,
  };
}

describe('Bundler', () => {
  const testOutputDir = path.resolve(
    '.tmp',
    `bundler-${Date.now()}-${getId()}`,
  );
  let logger: Logger;

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
    // Clean build cache to ensure each test starts fresh
    await fs.remove(path.join('.tmp', 'cache', 'builds'));
    // Create a silent logger for tests
    logger = createLogger({ silent: true });
    // Mock console.log to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock fs.stat for bundle stats
    const mockStat = {
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
    } satisfies Partial<fs.Stats>;
    jest
      .spyOn(fs, 'stat')
      .mockImplementation(() => Promise.resolve(mockStat as fs.Stats));
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
    // Restore console.log
    jest.restoreAllMocks();
  });

  it('should bundle minimal config successfully', async () => {
    const flowConfig: Flow.Config = {
      web: {},
      packages: {
        '@walkeros/core': {
          imports: ['getId'],
        },
      },
    };

    const buildOptions = createBuildOptions({
      packages: flowConfig.packages || {},
      code: 'export const test = getId(8);',
      platform: 'browser',
      format: 'esm',
      output: path.join(testOutputDir, 'minimal.js'),
    });

    await expect(
      bundle(flowConfig, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  it('should bundle server config with ESM format', async () => {
    const flowConfig: Flow.Config = {
      server: {},
      packages: {
        '@walkeros/core': {
          imports: ['trim', 'isString'],
        },
      },
    };

    const buildOptions = createBuildOptions({
      packages: flowConfig.packages || {},
      code: 'export default { processText: (text) => trim(text) };',
      platform: 'node',
      format: 'esm',
      output: path.join(testOutputDir, 'server-bundle.mjs'),
    });

    await expect(
      bundle(flowConfig, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  it('should bundle advanced config with minification', async () => {
    const flowConfig: Flow.Config = {
      web: {},
      packages: {
        '@walkeros/core': {
          imports: ['getId', 'getByPath', 'clone', 'trim', 'isObject'],
        },
      },
    };

    const buildOptions = createBuildOptions({
      packages: flowConfig.packages || {},
      code: "export function processData(data) {\n  return data.map(item => ({\n    ...item,\n    id: getId(8),\n    timestamp: new Date().toISOString().split('T')[0],\n    processed: true\n  }));\n}\n\nexport function extractNestedValues(data, path) {\n  return data.map(item => getByPath(item, path, null)).filter(val => val !== null);\n}\n\nexport function deepCloneData(data) {\n  return clone(data);\n}\n\nexport function cleanStringData(data) {\n  return data.map(item => ({\n    ...item,\n    name: typeof item.name === 'string' ? trim(item.name) : item.name\n  }));\n}\n\n// Re-export walkerOS utilities\nexport { getId, getByPath, clone, trim, isObject };",
      platform: 'browser',
      format: 'esm',
      target: 'es2020',
      minify: true,
      sourcemap: true,
      output: path.join(testOutputDir, 'advanced-bundle.js'),
    });

    await expect(
      bundle(flowConfig, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  describe('Stats Collection', () => {
    it('should collect bundle stats when requested', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/core': {
            imports: ['getId'],
          },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: 'export const test = getId(8);',
        format: 'esm',
        output: path.join(testOutputDir, 'stats-test.js'),
      });

      const stats = await bundle(flowConfig, buildOptions, logger, true);

      expect(stats).toBeDefined();
      expect(stats!.totalSize).toBe(1024); // From mocked fs.stat
      expect(stats!.buildTime).toBeGreaterThanOrEqual(0);
      expect(stats!.treeshakingEffective).toBe(true);
      expect(stats!.packages).toHaveLength(1);
      expect(stats!.packages[0].name).toBe('@walkeros/core@latest');
    });

    it('should detect ineffective tree-shaking with wildcard imports', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: { '@walkeros/core': {} },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: 'import * as walkerCore from "@walkeros/core";\nexport const test = walkerCore.getId;',
        format: 'esm',
        output: path.join(testOutputDir, 'test.js'),
      });

      const stats = await bundle(flowConfig, buildOptions, logger, true);

      expect(stats!.treeshakingEffective).toBe(false);
    });

    it('should return undefined when stats not requested', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/core': {
            imports: ['getId'],
          },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: 'export const test = getId(8);',
        format: 'esm',
        output: path.join(testOutputDir, 'no-stats.js'),
      });

      const result = await bundle(flowConfig, buildOptions, logger, false);

      expect(result).toBeUndefined();
    });
  });

  describe('Configuration Scenarios', () => {
    it('should handle custom temp directory configuration', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/core': { imports: ['getId'] },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: 'export const test = getId();',
        format: 'esm',
        tempDir: '/tmp/my-custom-bundler-temp',
        output: path.join(testOutputDir, 'custom-temp-example.js'),
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });

    it('should handle version pinning correctly', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/core': { version: '0.0.7', imports: ['getId'] },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: '// Test version pinning\nexport const test = getId();',
        platform: 'browser',
        format: 'esm',
        target: 'es2020',
        output: path.join(testOutputDir, 'version-test.js'),
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid config structure', async () => {
      // Test that loader rejects invalid config structure
      expect(() => {
        loadBundleConfig(
          {
            flow: {
              platform: 'web',
            },
            build: {
              packages: {},
            },
          },
          { configPath: '/test/config.json' },
        );
      }).toThrow(/Invalid configuration/);
    });
  });

  describe('buildConfigObject', () => {
    it('uses explicit code for named imports', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
            config: { settings: { port: 8080 } },
          },
        },
        destinations: {
          demo: {
            package: '@walkeros/destination-demo',
            code: 'destinationDemo',
            config: { settings: { name: 'Test' } },
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/server-source-express', new Set(['sourceExpress'])],
        ['@walkeros/destination-demo', new Set(['destinationDemo'])],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      expect(result).toContain('code: sourceExpress');
      expect(result).toContain('code: destinationDemo');
      expect(result).toContain('"port": 8080');
      expect(result).toContain('"name": "Test"');
    });

    it('uses default import variable when no explicit code', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            config: { settings: { port: 8080 } },
          },
        },
        destinations: {},
      };

      const explicitCodeImports = new Map(); // No explicit imports

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      expect(result).toContain('code: _walkerosServerSourceExpress');
    });
  });

  describe('$code: prefix support', () => {
    it('outputs raw JavaScript for $code: prefixed values', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
            config: {
              settings: {
                transform: '$code:(value) => value.toUpperCase()',
              },
            },
          },
        },
        destinations: {},
      };

      const explicitCodeImports = new Map([
        ['@walkeros/server-source-express', new Set(['sourceExpress'])],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Should contain raw JS, not quoted string
      expect(result).toContain('"transform": (value) => value.toUpperCase()');
      // Should NOT contain the $code: prefix
      expect(result).not.toContain('$code:');
    });

    it('handles nested $code: values in objects', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/destination-demo',
            code: 'destinationDemo',
            config: {
              mapping: {
                product: {
                  view: {
                    data: {
                      map: {
                        price: {
                          key: 'data.price',
                          fn: '$code:(v) => Math.round(v * 100)',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/destination-demo', new Set(['destinationDemo'])],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Should contain raw JS function
      expect(result).toContain('"fn": (v) => Math.round(v * 100)');
      expect(result).not.toContain('$code:');
    });

    it('handles $code: values in arrays', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/destination-demo',
            code: 'destinationDemo',
            config: {
              settings: {
                transforms: ['$code:(x) => x * 2', '$code:(x) => x.trim()'],
              },
            },
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/destination-demo', new Set(['destinationDemo'])],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      expect(result).toContain('(x) => x * 2');
      expect(result).toContain('(x) => x.trim()');
      expect(result).not.toContain('$code:');
    });

    it('preserves normal strings without $code: prefix', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/destination-demo',
            code: 'destinationDemo',
            config: {
              settings: {
                url: 'https://api.example.com',
                name: 'Test API',
              },
            },
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/destination-demo', new Set(['destinationDemo'])],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Normal strings should be quoted
      expect(result).toContain('"url": "https://api.example.com"');
      expect(result).toContain('"name": "Test API"');
    });

    it('handles mixed $code: and regular values', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/destination-demo',
            code: 'destinationDemo',
            config: {
              settings: {
                name: 'Test',
                port: 8080,
                enabled: true,
                transform: '$code:(x) => x',
              },
            },
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/destination-demo', new Set(['destinationDemo'])],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      expect(result).toContain('"name": "Test"');
      expect(result).toContain('"port": 8080');
      expect(result).toContain('"enabled": true');
      expect(result).toContain('"transform": (x) => x');
    });
  });

  describe('generatePlatformWrapper', () => {
    it('generates web IIFE wrapper', () => {
      const config = '{ sources: {}, destinations: {} }';
      const userCode = 'console.log("custom code");';
      const buildOptions = {
        platform: 'browser',
        windowCollector: 'collector',
        windowElb: 'elb',
      };

      const result = generatePlatformWrapper(config, userCode, buildOptions);

      expect(result).toContain('(async () => {');
      expect(result).toContain(
        'const config = { sources: {}, destinations: {} };',
      );
      expect(result).toContain('console.log("custom code");');
      expect(result).toContain('await startFlow(config)');
      expect(result).toContain("window['collector'] = collector");
      expect(result).toContain("window['elb'] = elb");
    });

    it('generates server export default wrapper', () => {
      const config = '{ sources: {}, destinations: {} }';
      const userCode = '';
      const buildOptions = { platform: 'node' };

      const result = generatePlatformWrapper(config, userCode, buildOptions);

      expect(result).toContain('export default async function');
      expect(result).toContain(
        'const config = { sources: {}, destinations: {} };',
      );
      expect(result).toContain('return await startFlow(config)');
      expect(result).not.toContain('window');
    });
  });

  describe('createEntryPoint integration', () => {
    it('generates default import even when imports are specified', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/web-source-browser': {
            imports: ['createTagger'],
          },
        },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
            // No code - should use default import
          },
        },
        destinations: {},
      };

      const buildOptions = {
        platform: 'browser',
        format: 'esm',
        packages: {
          '@walkeros/web-source-browser': { imports: ['createTagger'] },
        },
        output: './dist/bundle.js',
        code: '',
      };

      const result = await createEntryPoint(
        flowConfig,
        buildOptions as BuildOptions,
        new Map([['@walkeros/web-source-browser', '/tmp/pkg']]),
      );

      // Should have BOTH default AND named imports
      expect(result).toContain(
        "import _walkerosWebSourceBrowser from '@walkeros/web-source-browser'",
      );
      expect(result).toContain(
        "import { createTagger } from '@walkeros/web-source-browser'",
      );
      // Config should use the default import variable
      expect(result).toContain('code: _walkerosWebSourceBrowser');
    });

    it('uses named import only when explicit code is specified', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@some/no-default-pkg': {
            imports: ['namedSource'],
          },
        },
        sources: {
          custom: {
            package: '@some/no-default-pkg',
            code: 'namedSource', // Explicit code
          },
        },
        destinations: {},
      };

      const buildOptions = {
        platform: 'browser',
        format: 'esm',
        packages: {
          '@some/no-default-pkg': { imports: ['namedSource'] },
        },
        output: './dist/bundle.js',
        code: '',
      };

      const result = await createEntryPoint(
        flowConfig,
        buildOptions as BuildOptions,
        new Map([['@some/no-default-pkg', '/tmp/pkg']]),
      );

      // Should have named import only, NO default import
      expect(result).toContain(
        "import { namedSource } from '@some/no-default-pkg'",
      );
      expect(result).not.toContain('import _someNoDefaultPkg from');
      // Config should use the named import
      expect(result).toContain('code: namedSource');
    });

    it('generates complete entry point with explicit code', async () => {
      const flowConfig: Flow.Config = {
        server: {},
        packages: {
          '@walkeros/collector': { imports: ['startFlow'] },
          '@walkeros/server-source-express': {},
          '@walkeros/destination-demo': {},
        },
        sources: {
          http: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
            config: { settings: { port: 8080 } },
          },
        },
        destinations: {
          demo: {
            package: '@walkeros/destination-demo',
            code: 'destinationDemo',
            config: { settings: { name: 'Test' } },
          },
        },
      };

      const buildOptions = {
        platform: 'node',
        format: 'esm',
        packages: {
          '@walkeros/collector': { imports: ['startFlow'] },
          '@walkeros/server-source-express': {},
          '@walkeros/destination-demo': {},
        },
        output: './dist/bundle.mjs',
        code: '',
      };

      const result = await createEntryPoint(
        flowConfig,
        buildOptions as BuildOptions,
        new Map(),
      );

      // Should have named imports
      expect(result).toContain(
        "import { startFlow } from '@walkeros/collector'",
      );
      expect(result).toContain(
        "import { sourceExpress } from '@walkeros/server-source-express'",
      );
      expect(result).toContain(
        "import { destinationDemo } from '@walkeros/destination-demo'",
      );

      // Should use those imports in config
      expect(result).toContain('code: sourceExpress');
      expect(result).toContain('code: destinationDemo');

      // Should have server wrapper
      expect(result).toContain('export default async function');
    });
  });

  describe('Implicit Collector', () => {
    it('auto-imports startFlow when collector is in packages without imports specified', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/collector': {}, // No imports specified
          '@walkeros/web-source-browser': {},
        },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
          },
        },
        destinations: {},
      };

      const buildOptions = {
        platform: 'browser',
        format: 'esm',
        packages: {
          '@walkeros/collector': {}, // No imports specified
          '@walkeros/web-source-browser': {},
        },
        output: './dist/bundle.js',
        code: '',
      };

      const result = await createEntryPoint(
        flowConfig,
        buildOptions as BuildOptions,
        new Map([
          ['@walkeros/collector', '/tmp/collector'],
          ['@walkeros/web-source-browser', '/tmp/browser'],
        ]),
      );

      // Should auto-import startFlow from collector
      expect(result).toContain(
        "import { startFlow } from '@walkeros/collector'",
      );
    });

    it('auto-imports startFlow when collector has version but no imports', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/collector': { version: '0.5.0' }, // Version only, no imports
          '@walkeros/web-source-browser': {},
        },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
          },
        },
        destinations: {},
      };

      const buildOptions = {
        platform: 'browser',
        format: 'esm',
        packages: {
          '@walkeros/collector': { version: '0.5.0' },
          '@walkeros/web-source-browser': {},
        },
        output: './dist/bundle.js',
        code: '',
      };

      const result = await createEntryPoint(
        flowConfig,
        buildOptions as BuildOptions,
        new Map([
          ['@walkeros/collector', '/tmp/collector'],
          ['@walkeros/web-source-browser', '/tmp/browser'],
        ]),
      );

      // Should auto-import startFlow from collector
      expect(result).toContain(
        "import { startFlow } from '@walkeros/collector'",
      );
    });

    it('preserves explicit collector imports while adding startFlow', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/collector': { imports: ['createCollector'] }, // Explicit import, no startFlow
          '@walkeros/web-source-browser': {},
        },
        sources: {
          browser: {
            package: '@walkeros/web-source-browser',
          },
        },
        destinations: {},
      };

      const buildOptions = {
        platform: 'browser',
        format: 'esm',
        packages: {
          '@walkeros/collector': { imports: ['createCollector'] },
          '@walkeros/web-source-browser': {},
        },
        output: './dist/bundle.js',
        code: '',
      };

      const result = await createEntryPoint(
        flowConfig,
        buildOptions as BuildOptions,
        new Map([
          ['@walkeros/collector', '/tmp/collector'],
          ['@walkeros/web-source-browser', '/tmp/browser'],
        ]),
      );

      // Should have both createCollector and startFlow
      expect(result).toContain('startFlow');
      expect(result).toContain('createCollector');
    });
  });

  describe('detectTransformerPackages', () => {
    it('detects transformer packages from flow config', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          fingerprint: {
            package: '@walkeros/server-transformer-fingerprint',
            code: 'transformerFingerprint',
            config: { settings: { output: 'user.hash' } },
          },
          validate: {
            package: '@walkeros/transformer-validator',
          },
        },
      };

      const result = detectTransformerPackages(flowConfig);

      expect(result).toEqual(
        new Set([
          '@walkeros/server-transformer-fingerprint',
          '@walkeros/transformer-validator',
        ]),
      );
    });

    it('returns empty set when no transformers', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {},
      };

      const result = detectTransformerPackages(flowConfig);

      expect(result).toEqual(new Set());
    });
  });

  describe('detectExplicitCodeImports', () => {
    it('detects explicit code imports from transformers', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          fingerprint: {
            package: '@walkeros/server-transformer-fingerprint',
            code: 'transformerFingerprint',
            config: {},
          },
        },
      };

      const result = detectExplicitCodeImports(flowConfig);

      expect(result.get('@walkeros/server-transformer-fingerprint')).toEqual(
        new Set(['transformerFingerprint']),
      );
    });
  });

  describe('transformer support', () => {
    it('includes transformers in config object', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          fingerprint: {
            package: '@walkeros/server-transformer-fingerprint',
            code: 'transformerFingerprint',
            config: {
              settings: {
                fields: ['ingest.ip', 'ingest.userAgent'],
                output: 'user.hash',
              },
            },
          },
        },
      };

      const explicitCodeImports = new Map([
        [
          '@walkeros/server-transformer-fingerprint',
          new Set(['transformerFingerprint']),
        ],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      expect(result).toContain('transformers:');
      expect(result).toContain('fingerprint:');
      expect(result).toContain('code: transformerFingerprint');
      expect(result).toContain('"output": "user.hash"');
    });

    it('handles transformer next field as top-level property', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          enrich: {
            package: '@walkeros/transformer-enricher',
            code: 'transformerEnrich',
            config: { apiUrl: 'https://api.example.com' },
            next: 'validate',
          },
          validate: {
            package: '@walkeros/transformer-validator',
            code: 'transformerValidator',
            config: {},
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/transformer-enricher', new Set(['transformerEnrich'])],
        ['@walkeros/transformer-validator', new Set(['transformerValidator'])],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // next should be a top-level property (consistent with destination.before)
      expect(result).toContain('next: "validate"');
    });

    it('handles $code: prefix in transformer config', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {},
        destinations: {},
        transformers: {
          fingerprint: {
            package: '@walkeros/server-transformer-fingerprint',
            code: 'transformerFingerprint',
            config: {
              settings: {
                fields: [
                  { fn: '$code:() => new Date().getDate()' },
                  'ingest.ip',
                ],
              },
            },
          },
        },
      };

      const explicitCodeImports = new Map([
        [
          '@walkeros/server-transformer-fingerprint',
          new Set(['transformerFingerprint']),
        ],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      expect(result).toContain('"fn": () => new Date().getDate()');
      expect(result).not.toContain('$code:');
    });
  });

  describe('chain property handling (unified)', () => {
    describe('source.next', () => {
      it('includes next property for package-based source', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {
            http: {
              package: '@walkeros/server-source-express',
              code: 'sourceExpress',
              next: 'validate',
            },
          },
          destinations: {},
        };

        const explicitCodeImports = new Map([
          ['@walkeros/server-source-express', new Set(['sourceExpress'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).toContain('next: "validate"');
      });

      it('includes next property for inline source', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {
            custom: {
              code: { type: 'test', push: '$code:(e) => e' },
              next: 'validate',
            },
          },
          destinations: {},
        };

        const result = buildConfigObject(flowConfig, new Map());

        expect(result).toContain('next: "validate"');
      });

      it('handles array next property for source', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {
            http: {
              package: '@walkeros/server-source-express',
              code: 'sourceExpress',
              next: ['validate', 'enrich'],
            },
          },
          destinations: {},
        };

        const explicitCodeImports = new Map([
          ['@walkeros/server-source-express', new Set(['sourceExpress'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).toContain('next: ["validate","enrich"]');
      });

      it('omits next property when not specified for source', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {
            http: {
              package: '@walkeros/server-source-express',
              code: 'sourceExpress',
            },
          },
          destinations: {},
        };

        const explicitCodeImports = new Map([
          ['@walkeros/server-source-express', new Set(['sourceExpress'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).not.toContain('next:');
      });
    });

    describe('destination.before', () => {
      it('includes before property for package-based destination', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {
            api: {
              package: '@walkeros/destination-api',
              code: 'destApi',
              before: 'redact',
            },
          },
        };

        const explicitCodeImports = new Map([
          ['@walkeros/destination-api', new Set(['destApi'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).toContain('before: "redact"');
      });

      it('includes before property for inline destination', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {
            custom: {
              code: { type: 'test', push: '$code:(e) => e' },
              before: 'redact',
            },
          },
        };

        const result = buildConfigObject(flowConfig, new Map());

        expect(result).toContain('before: "redact"');
      });

      it('handles array before property for destination', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {
            api: {
              package: '@walkeros/destination-api',
              code: 'destApi',
              before: ['redact', 'validate'],
            },
          },
        };

        const explicitCodeImports = new Map([
          ['@walkeros/destination-api', new Set(['destApi'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).toContain('before: ["redact","validate"]');
      });

      it('omits before property when not specified for destination', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {
            api: {
              package: '@walkeros/destination-api',
              code: 'destApi',
            },
          },
        };

        const explicitCodeImports = new Map([
          ['@walkeros/destination-api', new Set(['destApi'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).not.toContain('before:');
      });
    });

    describe('transformer.next', () => {
      it('includes next property for package-based transformer', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {},
          transformers: {
            validate: {
              package: '@walkeros/transformer-validator',
              code: 'validator',
              next: 'enrich',
            },
          },
        };

        const explicitCodeImports = new Map([
          ['@walkeros/transformer-validator', new Set(['validator'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).toContain('next: "enrich"');
      });

      it('includes next property for inline transformer', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {},
          transformers: {
            validate: {
              code: { type: 'test', push: '$code:(e) => e' },
              next: 'enrich',
            },
          },
        };

        const result = buildConfigObject(flowConfig, new Map());

        expect(result).toContain('next: "enrich"');
      });

      it('handles array next property for transformer', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {},
          transformers: {
            validate: {
              package: '@walkeros/transformer-validator',
              code: 'validator',
              next: ['enrich', 'redact'],
            },
          },
        };

        const explicitCodeImports = new Map([
          ['@walkeros/transformer-validator', new Set(['validator'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).toContain('next: ["enrich","redact"]');
      });

      it('omits next property when not specified for transformer', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {},
          destinations: {},
          transformers: {
            validate: {
              package: '@walkeros/transformer-validator',
              code: 'validator',
            },
          },
        };

        const explicitCodeImports = new Map([
          ['@walkeros/transformer-validator', new Set(['validator'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        expect(result).not.toContain('next:');
      });
    });

    describe('full chain integration', () => {
      it('preserves all chain properties in complete flow', () => {
        const flowConfig: Flow.Config = {
          server: {},
          sources: {
            http: {
              package: '@walkeros/server-source-express',
              code: 'sourceExpress',
              next: 'validate',
            },
          },
          transformers: {
            validate: {
              package: '@walkeros/transformer-validator',
              code: 'validator',
              next: 'enrich',
            },
            enrich: {
              package: '@walkeros/transformer-enricher',
              code: 'enricher',
            },
            redact: {
              package: '@walkeros/transformer-redact',
              code: 'redactor',
            },
          },
          destinations: {
            api: {
              package: '@walkeros/destination-api',
              code: 'destApi',
              before: 'redact',
            },
          },
        };

        const explicitCodeImports = new Map([
          ['@walkeros/server-source-express', new Set(['sourceExpress'])],
          ['@walkeros/transformer-validator', new Set(['validator'])],
          ['@walkeros/transformer-enricher', new Set(['enricher'])],
          ['@walkeros/transformer-redact', new Set(['redactor'])],
          ['@walkeros/destination-api', new Set(['destApi'])],
        ]);

        const result = buildConfigObject(flowConfig, explicitCodeImports);

        // Source has pre-collector chain
        expect(result).toMatch(/sources:[\s\S]*next: "validate"/);

        // Transformer has chain link
        expect(result).toMatch(
          /transformers:[\s\S]*validate:[\s\S]*next: "enrich"/,
        );

        // Destination has post-collector chain
        expect(result).toMatch(/destinations:[\s\S]*before: "redact"/);
      });
    });
  });

  describe('full flow with transformers', () => {
    it('generates complete config with source -> transformer -> destination chain', () => {
      const flowConfig: Flow.Config = {
        server: {},
        sources: {
          express: {
            package: '@walkeros/server-source-express',
            code: 'sourceExpress',
            config: { settings: { port: 8080 } },
            next: 'fingerprint',
          },
        },
        transformers: {
          fingerprint: {
            package: '@walkeros/server-transformer-fingerprint',
            code: 'transformerFingerprint',
            config: {
              settings: {
                fields: [
                  { fn: '$code:() => new Date().getDate()' },
                  'ingest.ip',
                ],
                output: 'user.hash',
              },
            },
          },
        },
        destinations: {
          bigquery: {
            package: '@walkeros/server-destination-bigquery',
            code: 'destinationBigQuery',
            config: { settings: { projectId: 'my-project' } },
          },
        },
      };

      const explicitCodeImports = new Map([
        ['@walkeros/server-source-express', new Set(['sourceExpress'])],
        [
          '@walkeros/server-transformer-fingerprint',
          new Set(['transformerFingerprint']),
        ],
        [
          '@walkeros/server-destination-bigquery',
          new Set(['destinationBigQuery']),
        ],
      ]);

      const result = buildConfigObject(flowConfig, explicitCodeImports);

      // Sources with chain property
      expect(result).toContain('sources:');
      expect(result).toContain('code: sourceExpress');
      expect(result).toContain('next: "fingerprint"');

      // Transformers
      expect(result).toContain('transformers:');
      expect(result).toContain('code: transformerFingerprint');
      expect(result).toContain('"fn": () => new Date().getDate()');

      // Destinations
      expect(result).toContain('destinations:');
      expect(result).toContain('code: destinationBigQuery');
    });
  });
});
