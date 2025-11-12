import fs from 'fs-extra';
import path from 'path';
import { bundle } from '../../bundle/bundler';
import { parseBundleConfig } from '../../bundle/config';
import { createLogger, type Logger } from '../../core';
import { getId } from '@walkeros/core';

describe('Bundler Integration', () => {
  const testOutputDir = path.join(
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
      platform: 'web',
      packages: {
        '@walkeros/core': {
          imports: ['getId'],
        },
      },
      code: 'export const test = getId(8);',
      build: {
        platform: 'browser',
        format: 'esm',
      },
      output: path.join(testOutputDir, 'test-config.js'),
    };

    const config = parseBundleConfig(rawConfig);

    expect(Object.keys(config.packages)).toHaveLength(1);
    expect('@walkeros/core' in config.packages).toBe(true);
    expect(config.code).toContain('getId');
    expect(config.build.platform).toBe('browser');
    expect(config.output).toBe(path.join(testOutputDir, 'test-config.js'));
  });

  it('should handle template configuration', async () => {
    const rawConfig = {
      platform: 'web',
      packages: {
        '@walkeros/core': {
          imports: ['getId'],
        },
      },
      code: 'export const test = getId(8);',
      template: 'templates/web.hbs',
      output: path.join(testOutputDir, 'template-test.js'),
    };

    const config = parseBundleConfig(rawConfig);

    expect(config.template).toBeDefined();
    expect(config.template).toBe('templates/web.hbs');
  });

  it('should validate custom build configuration', async () => {
    const rawConfig = {
      platform: 'server',
      packages: {},
      code: 'export const test = "hello";',
      build: {
        platform: 'node',
        format: 'cjs',
        minify: true,
        sourcemap: true,
        target: 'node18',
      },
      output: path.join(testOutputDir, 'build-test.js'),
    };

    const config = parseBundleConfig(rawConfig);

    expect(config.build.platform).toBe('node');
    expect(config.build.format).toBe('cjs');
    expect(config.build.minify).toBe(true);
    expect(config.build.sourcemap).toBe(true);
    expect(config.build.target).toBe('node18');
  });

  it('should handle error conditions gracefully', async () => {
    // Test with invalid syntax in content
    const config = parseBundleConfig({
      platform: 'web',
      packages: {},
      code: 'export const badCode = () => { return [1,2,3] x => x * 2; };',
      output: path.join(testOutputDir, 'error-test.js'),
    });

    // Should not throw during configuration parsing
    expect(config.code).toContain('badCode');
  });
});
