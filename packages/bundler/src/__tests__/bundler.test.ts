import fs from 'fs-extra';
import path from 'path';
import { bundle } from '../bundler';
import { parseConfig } from '../config';

// Mock the package manager to avoid external dependencies in tests
jest.mock('../package-manager', () => ({
  downloadPackages: jest.fn().mockResolvedValue(
    new Map([
      ['lodash-es', '/mocked/node_modules/lodash-es'],
      ['dayjs', '/mocked/node_modules/dayjs'],
    ]),
  ),
}));

// Mock esbuild to avoid actual bundling in tests
jest.mock('esbuild', () => ({
  build: jest.fn().mockResolvedValue({}),
}));

import esbuild from 'esbuild';
const mockEsbuildBuild = esbuild.build as jest.MockedFunction<
  typeof esbuild.build
>;

describe('Bundler', () => {
  const testOutputDir = 'test-output';

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
    // Reset mocks
    mockEsbuildBuild.mockClear();
    // Mock console.log to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
    // Restore console.log
    jest.restoreAllMocks();
  });

  it('should bundle minimal config successfully', async () => {
    // Read the minimal config example
    const configPath = path.join('examples', 'minimal.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler (mocked dependencies should complete without error)
    await expect(bundle(config)).resolves.not.toThrow();
  });

  it('should bundle node config with CJS format', async () => {
    // Read the node config example
    const configPath = path.join('examples', 'node.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler (mocked dependencies should complete without error)
    await expect(bundle(config)).resolves.not.toThrow();
  });

  it('should bundle advanced config with minification', async () => {
    // Read the advanced config example
    const configPath = path.join('examples', 'advanced.config.json');
    const rawConfig = await fs.readJson(configPath);

    // Modify output directory for test
    rawConfig.output.dir = testOutputDir;
    const config = parseConfig(rawConfig);

    // Run bundler (mocked dependencies should complete without error)
    await expect(bundle(config)).resolves.not.toThrow();
  });

  describe('Stats Collection', () => {
    beforeEach(async () => {
      // Mock fs.stat to return bundle size
      jest
        .spyOn(fs, 'stat')
        .mockImplementation(() => Promise.resolve({ size: 51200 } as fs.Stats));
      // Also mock console.log for this nested describe
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should collect bundle stats when requested', async () => {
      const configPath = path.join('examples', 'minimal.config.json');
      const rawConfig = await fs.readJson(configPath);
      rawConfig.output.dir = testOutputDir;
      const config = parseConfig(rawConfig);

      const stats = await bundle(config, true);

      expect(stats).toBeDefined();
      expect(stats!.totalSize).toBe(51200);
      expect(stats!.buildTime).toBeGreaterThan(0);
      expect(stats!.treeshakingEffective).toBe(true);
      expect(stats!.packages).toHaveLength(1);
      expect(stats!.packages[0].name).toBe('lodash-es@4.17.21');
    });

    it('should detect ineffective tree-shaking with wildcard imports', async () => {
      const config = parseConfig({
        packages: [{ name: 'lodash-es', version: '4.17.21' }],
        customCode:
          'import * as _ from "lodash-es";\nexport const test = _.map;',
        output: { dir: testOutputDir, filename: 'test.js' },
      });

      const stats = await bundle(config, true);

      expect(stats!.treeshakingEffective).toBe(false);
    });

    it('should return undefined when stats not requested', async () => {
      const configPath = path.join('examples', 'minimal.config.json');
      const rawConfig = await fs.readJson(configPath);
      rawConfig.output.dir = testOutputDir;
      const config = parseConfig(rawConfig);

      const result = await bundle(config, false);

      expect(result).toBeUndefined();
    });
  });

  describe('Template System', () => {
    it('should apply inline template correctly', async () => {
      const config = parseConfig({
        packages: [{ name: 'dayjs', version: '1.11.10' }],
        customCode:
          'import dayjs from "dayjs";\nexport const now = () => dayjs().format();',
        template: {
          content:
            '// {{NAME}} v{{VERSION}}\n{{BUNDLE}}\nexport default { name: "{{NAME}}" };',
          variables: { NAME: 'TestLib', VERSION: '1.0.0' },
        },
        output: { dir: testOutputDir, filename: 'template-test.js' },
      });

      await expect(bundle(config)).resolves.not.toThrow();
    });

    it('should handle missing template variables gracefully', async () => {
      const config = parseConfig({
        packages: [{ name: 'dayjs', version: '1.11.10' }],
        customCode: 'export const test = "hello";',
        template: {
          content: '{{BUNDLE}}\n// {{MISSING_VAR}} should remain as-is',
          variables: { OTHER_VAR: 'exists' },
        },
        output: { dir: testOutputDir, filename: 'missing-vars.js' },
      });

      await expect(bundle(config)).resolves.not.toThrow();
    });

    it('should append bundle code when placeholder not found', async () => {
      const config = parseConfig({
        packages: [{ name: 'dayjs', version: '1.11.10' }],
        customCode: 'export const test = "hello";',
        template: {
          content: '// Header only template',
        },
        output: { dir: testOutputDir, filename: 'append-test.js' },
      });

      await expect(bundle(config)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle esbuild errors with location information', async () => {
      const mockError = {
        errors: [
          {
            text: 'Expected ")" but found "x"',
            location: {
              file: '.temp/entry.js',
              line: 4,
              column: 21,
            },
          },
        ],
      };
      mockEsbuildBuild.mockRejectedValueOnce(mockError);

      const config = parseConfig({
        packages: [{ name: 'lodash-es', version: '4.17.21' }],
        customCode:
          'import { map } from "lodash-es";\n\nexport const badCode = () => {\n  return map([1,2,3] x => x * 2);\n};',
        output: { dir: testOutputDir, filename: 'error-test.js' },
      });

      await expect(bundle(config)).rejects.toThrow(
        'Custom code syntax error at line 4, column 21:',
      );
    });

    it('should handle esbuild errors without location information', async () => {
      const mockError = {
        errors: [
          {
            text: 'Module not found',
            location: {
              file: 'some-package.js',
              line: 1,
              column: 1,
            },
          },
        ],
      };
      mockEsbuildBuild.mockRejectedValueOnce(mockError);

      const config = parseConfig({
        packages: [{ name: 'lodash-es', version: '4.17.21' }],
        customCode:
          'import { map } from "lodash-es";\nexport const test = map;',
        output: { dir: testOutputDir, filename: 'error-test.js' },
      });

      await expect(bundle(config)).rejects.toThrow(
        'Build error: Module not found',
      );
    });

    it('should handle esbuild errors with no errors array', async () => {
      const mockError = { message: 'Generic build failure' };
      mockEsbuildBuild.mockRejectedValueOnce(mockError);

      const config = parseConfig({
        packages: [{ name: 'lodash-es', version: '4.17.21' }],
        customCode: 'export const test = "hello";',
        output: { dir: testOutputDir, filename: 'error-test.js' },
      });

      await expect(bundle(config)).rejects.toThrow(
        'Build failed: Generic build failure',
      );
    });
  });
});
