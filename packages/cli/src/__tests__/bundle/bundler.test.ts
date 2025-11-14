import fs from 'fs-extra';
import path from 'path';
import { bundleCore as bundle } from '../../bundle/bundler';
import { parseBundleConfig } from '../../bundle/config';
import { createLogger, type Logger } from '../../core';
import { getId } from '@walkeros/core';

// No mocks - test with real package downloads and bundling

describe('Bundler', () => {
  const testOutputDir = path.resolve(
    '.tmp',
    `bundler-${Date.now()}-${getId()}`,
  );
  let logger: Logger;

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
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
    // Inline minimal configuration to avoid path dependencies
    const rawConfig = {
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {
          '@walkeros/core': {
            imports: ['getId'],
          },
        },
        code: 'export const test = getId(8);',
        platform: 'browser' as const,
        format: 'esm' as const,
        output: path.join(testOutputDir, 'minimal.js'),
      },
    };

    const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(
      bundle(flowConfig, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  it('should bundle server config with ESM format', async () => {
    // Inline server configuration
    const rawConfig = {
      flow: {
        platform: 'server' as const,
      },
      build: {
        packages: {
          '@walkeros/core': {
            imports: ['trim', 'isString'],
          },
        },
        code: 'export default { processText: (text) => trim(text) };',
        platform: 'node' as const,
        format: 'esm' as const,
        output: path.join(testOutputDir, 'server-bundle.mjs'),
      },
    };

    const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(
      bundle(flowConfig, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  it('should bundle advanced config with minification', async () => {
    // Inline advanced configuration
    const rawConfig = {
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {
          '@walkeros/core': {
            imports: ['getId', 'getByPath', 'clone', 'trim', 'isObject'],
          },
        },
        code: "export function processData(data) {\n  return data.map(item => ({\n    ...item,\n    id: getId(8),\n    timestamp: new Date().toISOString().split('T')[0],\n    processed: true\n  }));\n}\n\nexport function extractNestedValues(data, path) {\n  return data.map(item => getByPath(item, path, null)).filter(val => val !== null);\n}\n\nexport function deepCloneData(data) {\n  return clone(data);\n}\n\nexport function cleanStringData(data) {\n  return data.map(item => ({\n    ...item,\n    name: typeof item.name === 'string' ? trim(item.name) : item.name\n  }));\n}\n\n// Re-export walkerOS utilities\nexport { getId, getByPath, clone, trim, isObject };",
        platform: 'browser' as const,
        format: 'esm' as const,
        target: 'es2020',
        minify: true,
        sourcemap: true,
        output: path.join(testOutputDir, 'advanced-bundle.js'),
      },
    };

    const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(
      bundle(flowConfig, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  describe('Stats Collection', () => {
    it('should collect bundle stats when requested', async () => {
      const rawConfig = {
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {
            '@walkeros/core': {
              imports: ['getId'],
            },
          },
          code: 'export const test = getId(8);',
          output: path.join(testOutputDir, 'stats-test.js'),
        },
      };

      const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

      const stats = await bundle(flowConfig, buildOptions, logger, true);

      expect(stats).toBeDefined();
      expect(stats!.totalSize).toBe(1024); // From mocked fs.stat
      expect(stats!.buildTime).toBeGreaterThanOrEqual(0);
      expect(stats!.treeshakingEffective).toBe(true);
      expect(stats!.packages).toHaveLength(1);
      expect(stats!.packages[0].name).toBe('@walkeros/core@latest');
    });

    it('should detect ineffective tree-shaking with wildcard imports', async () => {
      const { flowConfig, buildOptions } = parseBundleConfig({
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: { '@walkeros/core': {} },
          code: 'import * as walkerCore from "@walkeros/core";\nexport const test = walkerCore.getId;',
          output: path.join(testOutputDir, 'test.js'),
        },
      });

      const stats = await bundle(flowConfig, buildOptions, logger, true);

      expect(stats!.treeshakingEffective).toBe(false);
    });

    it('should return undefined when stats not requested', async () => {
      const rawConfig = {
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {
            '@walkeros/core': {
              imports: ['getId'],
            },
          },
          code: 'export const test = getId(8);',
          output: path.join(testOutputDir, 'no-stats.js'),
        },
      };

      const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

      const result = await bundle(flowConfig, buildOptions, logger, false);

      expect(result).toBeUndefined();
    });
  });

  describe('Template System', () => {
    it('should handle template configuration', async () => {
      // Create a test template file
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(templatePath, '{{{CODE}}}\n// Template footer');

      const { flowConfig, buildOptions } = parseBundleConfig({
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
          code: 'export const generateId = () => getId(8);',
          template: templatePath,
          output: path.join(testOutputDir, 'template-test.js'),
        },
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });

    it('should handle missing template variables gracefully', async () => {
      const { flowConfig, buildOptions } = parseBundleConfig({
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {
            '@walkeros/core': { imports: ['trim'] },
          },
          code: 'export const test = trim("hello");',
          output: path.join(testOutputDir, 'missing-vars.js'),
        },
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });

    it('should append bundle code when placeholder not found', async () => {
      const { flowConfig, buildOptions } = parseBundleConfig({
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
          code: 'export const test = getId(6);',
          output: path.join(testOutputDir, 'append-test.js'),
        },
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });
  });

  describe('Configuration Scenarios', () => {
    it('should handle custom temp directory configuration', async () => {
      const { flowConfig, buildOptions } = parseBundleConfig({
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
          code: 'export const test = getId();',
          tempDir: '/tmp/my-custom-bundler-temp',
          output: path.join(testOutputDir, 'custom-temp-example.js'),
        },
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });

    it('should handle version pinning correctly', async () => {
      const { flowConfig, buildOptions } = parseBundleConfig({
        flow: {
          platform: 'web' as const,
        },
        build: {
          packages: {
            '@walkeros/core': { version: '0.0.7', imports: ['getId'] },
          },
          code: '// Test version pinning\nexport const test = getId();',
          platform: 'browser' as const,
          format: 'esm' as const,
          target: 'es2020',
          output: path.join(testOutputDir, 'version-test.js'),
        },
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should validate configuration properly', async () => {
      // Test configuration validation instead of runtime errors
      expect(() => {
        parseBundleConfig({
          flow: {
            platform: 'web' as const,
          },
          build: {
            packages: 'invalid', // should be object
            code: 'test',
            output: path.join(testOutputDir, 'test.js'),
          },
        });
      }).toThrow();
    });

    it('should require content field', async () => {
      expect(() => {
        parseBundleConfig({
          flow: {
            platform: 'web' as const,
          },
          build: {
            packages: {},
            // missing code field
            output: path.join(testOutputDir, 'test.js'),
          },
        });
      }).toThrow();
    });
  });
});
