import fs from 'fs-extra';
import path from 'path';
import { bundleCore as bundle } from '../../commands/bundle/bundler.js';
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
    environments: {
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
    tempDir: '.tmp',
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
      template: '',
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
      template: '',
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
      template: '',
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
        template: '',
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
        template: '',
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
        template: '',
        format: 'esm',
        output: path.join(testOutputDir, 'no-stats.js'),
      });

      const result = await bundle(flowConfig, buildOptions, logger, false);

      expect(result).toBeUndefined();
    });
  });

  describe('Template System', () => {
    it('should handle template configuration', async () => {
      // Create a test template file
      const templatePath = path.join(testOutputDir, 'test.hbs');
      await fs.writeFile(templatePath, '{{{CODE}}}\n// Template footer');

      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/core': { imports: ['getId'] },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: 'export const generateId = () => getId(8);',
        template: templatePath,
        output: path.join(testOutputDir, 'template-test.js'),
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });

    it('should handle missing template variables gracefully', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/core': { imports: ['trim'] },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: 'export const test = trim("hello");',
        template: '',
        format: 'esm',
        output: path.join(testOutputDir, 'missing-vars.js'),
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
    });

    it('should append bundle code when placeholder not found', async () => {
      const flowConfig: Flow.Config = {
        web: {},
        packages: {
          '@walkeros/core': { imports: ['getId'] },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowConfig.packages || {},
        code: 'export const test = getId(6);',
        template: '',
        format: 'esm',
        output: path.join(testOutputDir, 'append-test.js'),
      });

      await expect(
        bundle(flowConfig, buildOptions, logger),
      ).resolves.not.toThrow();
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
        template: '',
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
        template: '',
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
});
