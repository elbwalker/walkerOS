import fs from 'fs-extra';
import path from 'path';
import { bundle } from '../../commands/bundle';
import { getId } from '@walkeros/core';

describe('Programmatic Bundle API', () => {
  const testOutputDir = path.join(
    '.tmp',
    `programmatic-${Date.now()}-${getId()}`,
  );

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    // Mock console.log to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock fs.stat for bundle stats
    const mockStat = {
      size: 2048,
      isFile: () => true,
      isDirectory: () => false,
    } satisfies Partial<fs.Stats>;
    jest
      .spyOn(fs, 'stat')
      .mockImplementation(() => Promise.resolve(mockStat as fs.Stats));
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
    jest.restoreAllMocks();
  });

  it('should bundle with config object', async () => {
    const config = {
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {
          '@walkeros/core': {
            imports: ['getId', 'trim'],
          },
        },
        code: 'export const test = getId(8); export const clean = (s) => trim(s);',
        platform: 'browser',
        format: 'esm',
        output: path.join(testOutputDir, 'config-object.js'),
      },
    };

    await expect(bundle(config, { silent: true })).resolves.not.toThrow();
  });

  it('should bundle with config file path', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-serve.json',
    );

    await expect(bundle(configPath, { silent: true })).resolves.not.toThrow();
  });

  it('should return stats when requested', async () => {
    const config = {
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {
          '@walkeros/core': { imports: ['getId'] },
        },
        code: 'export const test = getId(8);',
        output: path.join(testOutputDir, 'with-stats.js'),
      },
    };

    const stats = await bundle(config, { silent: true, stats: true });

    expect(stats).toBeDefined();
    expect(stats!.totalSize).toBe(2048); // From mocked fs.stat
    expect(stats!.buildTime).toBeGreaterThanOrEqual(0);
    expect(stats!.packages).toHaveLength(1);
  });

  it('should return undefined when stats not requested', async () => {
    const config = {
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {
          '@walkeros/core': { imports: ['getId'] },
        },
        code: 'export const test = getId(8);',
        output: path.join(testOutputDir, 'no-stats.js'),
      },
    };

    const result = await bundle(config, { silent: true, stats: false });

    expect(result).toBeUndefined();
  });

  it('should handle cache option', async () => {
    const config = {
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {
          '@walkeros/core': { imports: ['getId'] },
        },
        code: 'export const test = getId(8);',
        output: path.join(testOutputDir, 'with-cache.js'),
      },
    };

    await expect(
      bundle(config, { silent: true, cache: false }),
    ).resolves.not.toThrow();
  });

  it('should handle verbose option', async () => {
    const config = {
      flow: {
        platform: 'web' as const,
      },
      build: {
        packages: {
          '@walkeros/core': { imports: ['getId'] },
        },
        code: 'export const test = getId(8);',
        output: path.join(testOutputDir, 'verbose.js'),
      },
    };

    await expect(
      bundle(config, { silent: false, verbose: true }),
    ).resolves.not.toThrow();
  });

  it('should handle errors gracefully', async () => {
    const invalidConfigPath = path.join(testOutputDir, 'nonexistent.json');

    await expect(bundle(invalidConfigPath, { silent: true })).rejects.toThrow(
      'Configuration file not found',
    );
  });
});
