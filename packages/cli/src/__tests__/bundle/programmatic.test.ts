import fs from 'fs-extra';
import path from 'path';
import { bundle } from '../../commands/bundle/index.js';
import { getId, type Flow } from '@walkeros/core';
import {
  loadBundleConfig,
  getBuildDefaults,
  getDefaultOutput,
} from '../../config/index.js';

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

  it('should bundle with Flow.Setup config object', async () => {
    const config: Flow.Setup = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': {
              imports: ['getId', 'trim'],
            },
          },
        },
      },
    };

    // Bundle will use convention-based output path
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
    const config: Flow.Setup = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      },
    };

    const stats = await bundle(config, { silent: true, stats: true });

    expect(stats).toBeDefined();
    expect(stats!.totalSize).toBe(2048); // From mocked fs.stat
    expect(stats!.buildTime).toBeGreaterThanOrEqual(0);
    expect(stats!.packages).toHaveLength(1);
  });

  it('should return undefined when stats not requested', async () => {
    const config: Flow.Setup = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      },
    };

    const result = await bundle(config, { silent: true, stats: false });

    expect(result).toBeUndefined();
  });

  it('should handle cache option', async () => {
    const config: Flow.Setup = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      },
    };

    await expect(
      bundle(config, { silent: true, cache: false }),
    ).resolves.not.toThrow();
  });

  it('should handle verbose option', async () => {
    const config: Flow.Setup = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
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

  it('should select flow from multi-flow config', async () => {
    const config: Flow.Setup = {
      version: 1,
      flows: {
        production: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
        staging: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      },
    };

    await expect(
      bundle(config, { silent: true, flowName: 'production' }),
    ).resolves.not.toThrow();
  });

  it('should apply platform-specific build defaults', () => {
    // Verify build defaults are correctly applied
    const webDefaults = getBuildDefaults('web');
    expect(webDefaults.format).toBe('iife');
    expect(webDefaults.platform).toBe('browser');
    expect(webDefaults.target).toBe('es2020');
    expect(webDefaults.template).toBe('web.hbs');

    const serverDefaults = getBuildDefaults('server');
    expect(serverDefaults.format).toBe('esm');
    expect(serverDefaults.platform).toBe('node');
    expect(serverDefaults.target).toBe('node20');
    expect(serverDefaults.template).toBe('server.hbs');
  });

  it('should use convention-based output paths', () => {
    expect(getDefaultOutput('web')).toBe('./dist/walker.js');
    expect(getDefaultOutput('server')).toBe('./dist/bundle.mjs');
  });
});
