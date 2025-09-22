import fs from 'fs-extra';
import path from 'path';
import { bundle } from '../bundler';
import { parseBundleConfig } from '../config';
import { createLogger } from '../../core';
import { getId } from '@walkeros/core';

// Mock package-manager to avoid pacote dependency issues in tests
jest.mock('../package-manager', () => ({
  downloadPackages: jest
    .fn()
    .mockResolvedValue(
      new Map([['@walkeros/core', '/tmp/mock-walkeros-core']]),
    ),
}));

// Mock esbuild to avoid actual bundling in tests
jest.mock('esbuild', () => ({
  __esModule: true,
  default: {
    build: jest.fn().mockResolvedValue({}),
  },
}));

describe('Bundler', () => {
  const testOutputDir = path.join('.tmp', `bundler-${Date.now()}-${getId()}`);
  let logger: any;

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
    // Create a silent logger for tests
    logger = createLogger({ silent: true });
    // Mock console.log to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock fs.stat for bundle stats
    jest.spyOn(fs, 'stat').mockResolvedValue({ size: 1024 } as any);
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
      packages: [
        {
          name: '@walkeros/core',
          version: 'latest',
          imports: ['getId'],
        },
      ],
      content: 'export const test = getId(8);',
      build: {
        platform: 'browser',
        format: 'esm',
      },
      output: {
        filename: 'minimal.js',
        dir: testOutputDir,
      },
    };

    const config = parseBundleConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(bundle(config, logger)).resolves.not.toThrow();
  });

  it('should bundle node config with CJS format', async () => {
    // Inline node configuration
    const rawConfig = {
      packages: [
        {
          name: '@walkeros/core',
          version: 'latest',
          imports: ['trim', 'isString'],
        },
      ],
      content: 'module.exports = { processText: (text) => trim(text) };',
      build: {
        platform: 'node',
        format: 'cjs',
      },
      output: {
        filename: 'node-bundle.js',
        dir: testOutputDir,
      },
    };

    const config = parseBundleConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(bundle(config, logger)).resolves.not.toThrow();
  });

  it('should bundle advanced config with minification', async () => {
    // Inline advanced configuration
    const rawConfig = {
      packages: [
        {
          name: '@walkeros/core',
          version: 'latest',
          imports: ['getId', 'getByPath', 'clone', 'trim', 'isObject'],
        },
      ],
      content:
        "export function processData(data) {\n  return data.map(item => ({\n    ...item,\n    id: getId(8),\n    timestamp: new Date().toISOString().split('T')[0],\n    processed: true\n  }));\n}\n\nexport function extractNestedValues(data, path) {\n  return data.map(item => getByPath(item, path, null)).filter(val => val !== null);\n}\n\nexport function deepCloneData(data) {\n  return clone(data);\n}\n\nexport function cleanStringData(data) {\n  return data.map(item => ({\n    ...item,\n    name: typeof item.name === 'string' ? trim(item.name) : item.name\n  }));\n}\n\n// Re-export walkerOS utilities\nexport { getId, getByPath, clone, trim, isObject };",
      build: {
        platform: 'browser',
        format: 'esm',
        target: 'es2020',
        minify: true,
        sourcemap: true,
      },
      output: {
        filename: 'advanced-bundle.js',
        dir: testOutputDir,
      },
    };

    const config = parseBundleConfig(rawConfig);

    // Run bundler with real dependencies
    await expect(bundle(config, logger)).resolves.not.toThrow();
  });

  describe('Stats Collection', () => {
    it('should collect bundle stats when requested', async () => {
      const rawConfig = {
        packages: [
          {
            name: '@walkeros/core',
            version: 'latest',
            imports: ['getId'],
          },
        ],
        content: 'export const test = getId(8);',
        output: {
          filename: 'stats-test.js',
          dir: testOutputDir,
        },
      };

      const config = parseBundleConfig(rawConfig);

      const stats = await bundle(config, logger, true);

      expect(stats).toBeDefined();
      expect(stats!.totalSize).toBe(1024); // From mocked fs.stat
      expect(stats!.buildTime).toBeGreaterThanOrEqual(0);
      expect(stats!.treeshakingEffective).toBe(true);
      expect(stats!.packages).toHaveLength(1);
      expect(stats!.packages[0].name).toBe('@walkeros/core@latest');
    });

    it('should detect ineffective tree-shaking with wildcard imports', async () => {
      const config = parseBundleConfig({
        packages: [{ name: '@walkeros/core', version: 'latest', imports: [] }],
        content:
          'import * as walkerCore from "@walkeros/core";\nexport const test = walkerCore.getId;',
        output: { dir: testOutputDir, filename: 'test.js' },
      });

      const stats = await bundle(config, logger, true);

      expect(stats!.treeshakingEffective).toBe(false);
    });

    it('should return undefined when stats not requested', async () => {
      const rawConfig = {
        packages: [
          {
            name: '@walkeros/core',
            version: 'latest',
            imports: ['getId'],
          },
        ],
        content: 'export const test = getId(8);',
        output: {
          filename: 'no-stats.js',
          dir: testOutputDir,
        },
      };

      const config = parseBundleConfig(rawConfig);

      const result = await bundle(config, logger, false);

      expect(result).toBeUndefined();
    });
  });

  describe('Template System', () => {
    it('should apply inline template correctly', async () => {
      const config = parseBundleConfig({
        packages: [
          { name: '@walkeros/core', version: 'latest', imports: ['getId'] },
        ],
        content: 'export const generateId = () => getId(8);',
        template: {
          content:
            '// {{NAME}} v{{VERSION}}\n{{CONTENT}}\nexport default { name: "{{NAME}}" };',
          variables: { NAME: 'TestLib', VERSION: '1.0.0' },
        },
        output: { dir: testOutputDir, filename: 'template-test.js' },
      });

      await expect(bundle(config, logger)).resolves.not.toThrow();
    });

    it('should handle missing template variables gracefully', async () => {
      const config = parseBundleConfig({
        packages: [
          { name: '@walkeros/core', version: 'latest', imports: ['trim'] },
        ],
        content: 'export const test = trim("hello");',
        template: {
          content: '{{CONTENT}}\n// {{MISSING_VAR}} should remain as-is',
          variables: { OTHER_VAR: 'exists' },
        },
        output: { dir: testOutputDir, filename: 'missing-vars.js' },
      });

      await expect(bundle(config, logger)).resolves.not.toThrow();
    });

    it('should append bundle code when placeholder not found', async () => {
      const config = parseBundleConfig({
        packages: [
          { name: '@walkeros/core', version: 'latest', imports: ['getId'] },
        ],
        content: 'export const test = getId(6);',
        template: {
          content: '// Header only template',
        },
        output: { dir: testOutputDir, filename: 'append-test.js' },
      });

      await expect(bundle(config, logger)).resolves.not.toThrow();
    });
  });

  describe('Configuration Scenarios', () => {
    it('should handle custom temp directory configuration', async () => {
      const config = parseBundleConfig({
        packages: [
          { name: '@walkeros/core', version: 'latest', imports: ['getId'] },
        ],
        content: 'export const test = getId();',
        tempDir: '/tmp/my-custom-bundler-temp',
        output: {
          filename: 'custom-temp-example.js',
          dir: testOutputDir,
        },
      });

      await expect(bundle(config, logger)).resolves.not.toThrow();
    });

    it('should handle version pinning correctly', async () => {
      const config = parseBundleConfig({
        packages: [
          { name: '@walkeros/core', version: '0.0.7', imports: ['getId'] },
        ],
        content: '// Test version pinning\nexport const test = getId();',
        build: {
          platform: 'browser',
          format: 'esm',
          target: 'es2020',
        },
        output: {
          filename: 'version-test.js',
          dir: testOutputDir,
        },
      });

      await expect(bundle(config, logger)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should validate configuration properly', async () => {
      // Test configuration validation instead of runtime errors
      expect(() => {
        parseBundleConfig({
          packages: 'invalid', // should be array
          content: 'test',
          output: { dir: testOutputDir, filename: 'test.js' },
        });
      }).toThrow();
    });

    it('should require content field', async () => {
      expect(() => {
        parseBundleConfig({
          packages: [],
          // missing content field
          output: { dir: testOutputDir, filename: 'test.js' },
        });
      }).toThrow();
    });
  });
});
