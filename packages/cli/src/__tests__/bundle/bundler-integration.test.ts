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
        filename: 'test-config.js',
        dir: testOutputDir,
      },
    };

    const config = parseBundleConfig(rawConfig);

    expect(config.packages).toHaveLength(1);
    expect(config.packages[0].name).toBe('@walkeros/core');
    expect(config.content).toContain('getId');
    expect(config.build.platform).toBe('browser');
    expect(config.output.filename).toBe('test-config.js');
  });

  it('should handle template configuration', async () => {
    const rawConfig = {
      packages: [
        {
          name: '@walkeros/core',
          version: 'latest',
          imports: ['getId'],
        },
      ],
      content: 'export const test = getId(8);',
      template: {
        content: '// Generated bundle\n{{CONTENT}}\n// End bundle',
      },
      output: {
        filename: 'template-test.js',
        dir: testOutputDir,
      },
    };

    const config = parseBundleConfig(rawConfig);

    expect(config.template).toBeDefined();
    expect(config.template?.content).toContain('{{CONTENT}}');
  });

  it('should validate custom build configuration', async () => {
    const rawConfig = {
      packages: [],
      content: 'export const test = "hello";',
      build: {
        platform: 'node',
        format: 'cjs',
        minify: true,
        sourcemap: true,
        target: 'node18',
      },
      output: {
        filename: 'build-test.js',
        dir: testOutputDir,
      },
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
      packages: [],
      content: 'export const badCode = () => { return [1,2,3] x => x * 2; };',
      output: { dir: testOutputDir, filename: 'error-test.js' },
    });

    // Should not throw during configuration parsing
    expect(config.content).toContain('badCode');
  });
});
