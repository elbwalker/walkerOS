import path from 'path';
import { bundle } from '../../../commands/bundle/index.js';
import type { Flow } from '@walkeros/core';
import { getBuildDefaults, getDefaultOutput } from '../../../config/index.js';
import type { BundleStats } from '../../../commands/bundle/bundler.js';

jest.mock('../../../commands/bundle/bundler.js', () => ({
  bundleCore: jest.fn(),
}));

import { bundleCore } from '../../../commands/bundle/bundler.js';
const mockBundleCore = jest.mocked(bundleCore);

const mockStats: BundleStats = {
  totalSize: 2048,
  packages: [{ name: '@walkeros/core', size: 1024 }],
  buildTime: 42,
  treeshakingEffective: true,
};

describe('Programmatic Bundle API', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockBundleCore.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const simpleConfig: Flow.Config = {
    version: 3,
    flows: {
      default: {
        web: {},
        packages: {
          '@walkeros/core': { imports: ['getId', 'trim'] },
        },
      },
    },
  };

  it('should bundle with Flow.Config config object', async () => {
    await expect(bundle(simpleConfig, { silent: true })).resolves.not.toThrow();

    expect(mockBundleCore).toHaveBeenCalledWith(
      expect.any(Object), // flowSettings
      expect.any(Object), // buildOptions
      expect.any(Object), // logger
      false, // showStats
    );
  });

  it('should bundle with config file path', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../../examples/web-serve.json',
    );

    await expect(bundle(configPath, { silent: true })).resolves.not.toThrow();
    expect(mockBundleCore).toHaveBeenCalled();
  });

  it('should return stats when requested', async () => {
    mockBundleCore.mockResolvedValue(mockStats);

    const stats = await bundle(simpleConfig, { silent: true, stats: true });

    expect(stats).toBeDefined();
    expect(stats!.totalSize).toBe(2048);
    expect(stats!.buildTime).toBe(42);
    expect(stats!.packages).toHaveLength(1);

    // bundleCore should be called with showStats=true
    expect(mockBundleCore).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      true,
    );
  });

  it('should return undefined when stats not requested', async () => {
    const result = await bundle(simpleConfig, { silent: true, stats: false });
    expect(result).toBeUndefined();
  });

  it('should pass cache option to buildOptions', async () => {
    await bundle(simpleConfig, { silent: true, cache: false });

    expect(mockBundleCore).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ cache: false }),
      expect.any(Object),
      false,
    );
  });

  it('should handle verbose option', async () => {
    await expect(
      bundle(simpleConfig, { silent: false, verbose: true }),
    ).resolves.not.toThrow();
    expect(mockBundleCore).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const invalidConfigPath = path.join('/tmp', 'nonexistent.json');

    await expect(bundle(invalidConfigPath, { silent: true })).rejects.toThrow(
      'Configuration file not found',
    );
  });

  it('should select flow from multi-flow config', async () => {
    const multiFlowConfig: Flow.Config = {
      version: 3,
      flows: {
        production: {
          web: {},
          packages: { '@walkeros/core': { imports: ['getId'] } },
        },
        staging: {
          web: {},
          packages: { '@walkeros/core': { imports: ['getId'] } },
        },
      },
    };

    await bundle(multiFlowConfig, { silent: true, flowName: 'production' });
    expect(mockBundleCore).toHaveBeenCalled();
  });

  it('should apply platform-specific build defaults', () => {
    const webDefaults = getBuildDefaults('web');
    expect(webDefaults.format).toBe('iife');
    expect(webDefaults.platform).toBe('browser');
    expect(webDefaults.target).toBe('es2020');

    const serverDefaults = getBuildDefaults('server');
    expect(serverDefaults.format).toBe('esm');
    expect(serverDefaults.platform).toBe('node');
    expect(serverDefaults.target).toBe('node20');
  });

  it('should use convention-based output paths', () => {
    expect(getDefaultOutput('web')).toBe('./dist/walker.js');
    expect(getDefaultOutput('server')).toBe('./dist/bundle.mjs');
  });
});
