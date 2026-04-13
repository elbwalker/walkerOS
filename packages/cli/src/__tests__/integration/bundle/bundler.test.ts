import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bundleCore as bundle } from '../../../commands/bundle/bundler.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import { getId, type Flow, type Logger } from '@walkeros/core';
import type { BuildOptions } from '../../../types/bundle.js';

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
  let logger: Logger.Instance;

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
    // Clean build cache to ensure each test starts fresh (cache lives in os.tmpdir())
    await fs.remove(path.join(os.tmpdir(), 'cache', 'builds'));
    // Create a silent logger for tests
    logger = createCLILogger({ silent: true });
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
    const flowSettings: Flow.Settings = {
      web: {},
      bundle: {
        packages: {
          '@walkeros/core': {
            imports: ['getId'],
          },
        },
      },
    };

    const buildOptions = createBuildOptions({
      packages: flowSettings.bundle?.packages || {},
      code: 'export const test = getId(8);',
      platform: 'browser',
      format: 'esm',
      output: path.join(testOutputDir, 'minimal.js'),
    });

    await expect(
      bundle(flowSettings, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  it('should bundle server config with ESM format', async () => {
    const flowSettings: Flow.Settings = {
      server: {},
      bundle: {
        packages: {
          '@walkeros/core': {
            imports: ['trim', 'isString'],
          },
        },
      },
    };

    const buildOptions = createBuildOptions({
      packages: flowSettings.bundle?.packages || {},
      code: 'export default { processText: (text) => trim(text) };',
      platform: 'node',
      format: 'esm',
      output: path.join(testOutputDir, 'server-bundle.mjs'),
    });

    await expect(
      bundle(flowSettings, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  it('should bundle advanced config with minification', async () => {
    const flowSettings: Flow.Settings = {
      web: {},
      bundle: {
        packages: {
          '@walkeros/core': {
            imports: ['getId', 'getByPath', 'clone', 'trim', 'isObject'],
          },
        },
      },
    };

    const buildOptions = createBuildOptions({
      packages: flowSettings.bundle?.packages || {},
      code: "export function processData(data) {\n  return data.map(item => ({\n    ...item,\n    id: getId(8),\n    timestamp: new Date().toISOString().split('T')[0],\n    processed: true\n  }));\n}\n\nexport function extractNestedValues(data, path) {\n  return data.map(item => getByPath(item, path, null)).filter(val => val !== null);\n}\n\nexport function deepCloneData(data) {\n  return clone(data);\n}\n\nexport function cleanStringData(data) {\n  return data.map(item => ({\n    ...item,\n    name: typeof item.name === 'string' ? trim(item.name) : item.name\n  }));\n}\n\n// Re-export walkerOS utilities\nexport { getId, getByPath, clone, trim, isObject };",
      platform: 'browser',
      format: 'esm',
      target: 'es2020',
      minify: true,
      sourcemap: true,
      output: path.join(testOutputDir, 'advanced-bundle.js'),
    });

    await expect(
      bundle(flowSettings, buildOptions, logger),
    ).resolves.not.toThrow();
  });

  describe('Stats Collection', () => {
    it('should collect bundle stats when requested', async () => {
      const flowSettings: Flow.Settings = {
        web: {},
        bundle: {
          packages: {
            '@walkeros/core': {
              imports: ['getId'],
            },
          },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowSettings.bundle?.packages || {},
        code: 'export const test = getId(8);',
        format: 'esm',
        output: path.join(testOutputDir, 'stats-test.js'),
      });

      const stats = await bundle(flowSettings, buildOptions, logger, true);

      expect(stats).toBeDefined();
      expect(stats!.totalSize).toBe(1024); // From mocked fs.stat
      expect(stats!.buildTime).toBeGreaterThanOrEqual(0);
      expect(stats!.treeshakingEffective).toBe(true);
      expect(stats!.packages).toHaveLength(1);
      expect(stats!.packages[0].name).toBe('@walkeros/core@latest');
    });

    it('should detect ineffective tree-shaking with wildcard imports', async () => {
      const flowSettings: Flow.Settings = {
        web: {},
        bundle: {
          packages: { '@walkeros/core': {} },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowSettings.bundle?.packages || {},
        code: 'import * as walkerCore from "@walkeros/core";\nexport const test = walkerCore.getId;',
        format: 'esm',
        output: path.join(testOutputDir, 'test.js'),
      });

      const stats = await bundle(flowSettings, buildOptions, logger, true);

      expect(stats!.treeshakingEffective).toBe(false);
    });

    it('should return undefined when stats not requested', async () => {
      const flowSettings: Flow.Settings = {
        web: {},
        bundle: {
          packages: {
            '@walkeros/core': {
              imports: ['getId'],
            },
          },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowSettings.bundle?.packages || {},
        code: 'export const test = getId(8);',
        format: 'esm',
        output: path.join(testOutputDir, 'no-stats.js'),
      });

      const result = await bundle(flowSettings, buildOptions, logger, false);

      expect(result).toBeUndefined();
    });
  });

  describe('Configuration Scenarios', () => {
    it('should handle custom temp directory configuration', async () => {
      const flowSettings: Flow.Settings = {
        web: {},
        bundle: {
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowSettings.bundle?.packages || {},
        code: 'export const test = getId();',
        format: 'esm',
        tempDir: '/tmp/my-custom-bundler-temp',
        output: path.join(testOutputDir, 'custom-temp-example.js'),
      });

      await expect(
        bundle(flowSettings, buildOptions, logger),
      ).resolves.not.toThrow();
    });

    it('should handle version pinning correctly', async () => {
      const flowSettings: Flow.Settings = {
        web: {},
        bundle: {
          packages: {
            '@walkeros/core': { version: '0.0.7', imports: ['getId'] },
          },
        },
      };

      const buildOptions = createBuildOptions({
        packages: flowSettings.bundle?.packages || {},
        code: '// Test version pinning\nexport const test = getId();',
        platform: 'browser',
        format: 'esm',
        target: 'es2020',
        output: path.join(testOutputDir, 'version-test.js'),
      });

      await expect(
        bundle(flowSettings, buildOptions, logger),
      ).resolves.not.toThrow();
    });
  });
});
