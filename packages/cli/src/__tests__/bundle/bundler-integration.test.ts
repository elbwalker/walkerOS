import fs from 'fs-extra';
import path from 'path';
import { bundleCore as bundle } from '../../bundle/bundler';
import { parseBundleConfig } from '../../bundle/config';
import { createLogger, type Logger } from '../../core';
import { getId } from '@walkeros/core';

describe('Bundler Integration', () => {
  const testOutputDir = path.resolve(
    '.tmp',
    `bundler-integration-${Date.now()}-${getId()}`,
  );
  let logger: Logger;

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
    // Create a silent logger for tests
    logger = createLogger({ silent: true });
    // Mock console.log to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
    // Restore console.log
    jest.restoreAllMocks();
  });

  it('should handle configuration parsing correctly', async () => {
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
        output: path.join(testOutputDir, 'test-config.js'),
      },
    };

    const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

    expect(Object.keys(buildOptions.packages)).toHaveLength(1);
    expect('@walkeros/core' in buildOptions.packages).toBe(true);
    expect(buildOptions.code).toContain('getId');
    expect(buildOptions.platform).toBe('browser');
    expect(buildOptions.output).toBe(
      path.join(testOutputDir, 'test-config.js'),
    );
  });

  it('should handle template configuration', async () => {
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
        template: 'templates/web.hbs',
        output: path.join(testOutputDir, 'template-test.js'),
      },
    };

    const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

    expect(buildOptions.template).toBeDefined();
    expect(buildOptions.template).toBe('templates/web.hbs');
  });

  it('should validate custom build configuration', async () => {
    const rawConfig = {
      flow: {
        platform: 'server' as const,
      },
      build: {
        packages: {},
        code: 'export const test = "hello";',
        platform: 'node' as const,
        format: 'esm' as const,
        minify: true,
        sourcemap: true,
        target: 'node18',
        output: path.join(testOutputDir, 'build-test.mjs'),
      },
    };

    const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

    expect(buildOptions.platform).toBe('node');
    expect(buildOptions.format).toBe('esm');
    expect(buildOptions.minify).toBe(true);
    expect(buildOptions.sourcemap).toBe(true);
    expect(buildOptions.target).toBe('node18');
  });

  it('should handle error conditions gracefully', async () => {
    // Test with invalid syntax in content
    const { flowConfig, buildOptions } = parseBundleConfig({
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {},
        code: 'export const badCode = () => { return [1,2,3] x => x * 2; };',
        output: path.join(testOutputDir, 'error-test.js'),
      },
    });

    // Should not throw during configuration parsing
    expect(buildOptions.code).toContain('badCode');
  });
});
