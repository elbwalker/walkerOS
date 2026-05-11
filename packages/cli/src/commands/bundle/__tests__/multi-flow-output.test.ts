/**
 * Multi-flow `--all` output layout
 *
 * Asserts that `bundleCommand` and `resolveOutputPath` write each flow to
 * its own subdirectory under the requested output dir:
 *   `dist/web/walker.js`     (web platform)
 *   `dist/server/flow.mjs`  (server platform)
 *
 * Single-flow output (no `--all`) keeps the legacy layout: directly under
 * the requested output dir, no flow-name nesting.
 */

import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type { BuildOptions } from '../../../types/bundle.js';

jest.mock('../../bundle/bundler.js', () => ({
  bundleCore: jest.fn(),
}));

import { bundleCore } from '../../bundle/bundler.js';
import { resolveOutputPath, bundleCommand } from '../index.js';

const mockBundleCore = jest.mocked(bundleCore);

describe('resolveOutputPath (multi-flow)', () => {
  const serverOptions: BuildOptions = {
    output: '',
    format: 'esm',
    platform: 'node',
    packages: {},
  } as BuildOptions;

  const webOptions: BuildOptions = {
    output: '',
    format: 'iife',
    platform: 'browser',
    packages: {},
  } as BuildOptions;

  it('without flowSubdir: keeps legacy layout (single-flow stays flat)', () => {
    const resolved = resolveOutputPath('dist/', serverOptions);
    expect(path.basename(resolved)).toBe('flow.mjs');
    expect(path.dirname(resolved).endsWith('dist')).toBe(true);
  });

  it('without flowSubdir: explicit file path passes through', () => {
    const resolved = resolveOutputPath('dist/custom.mjs', serverOptions);
    expect(path.basename(resolved)).toBe('custom.mjs');
  });

  it('with server flowSubdir: produces dist/<flow>/flow.mjs', () => {
    const resolved = resolveOutputPath('dist/', serverOptions, 'server');
    const segments = resolved.split(path.sep);
    expect(segments.slice(-3, -1)).toEqual(['dist', 'server']);
    expect(segments[segments.length - 1]).toBe('flow.mjs');
  });

  it('with web flowSubdir: produces dist/<flow>/walker.js', () => {
    const resolved = resolveOutputPath('dist/', webOptions, 'web');
    const segments = resolved.split(path.sep);
    expect(segments.slice(-3, -1)).toEqual(['dist', 'web']);
    expect(segments[segments.length - 1]).toBe('walker.js');
  });

  it('with flowSubdir: still nests when output is a file path (treat as dir)', () => {
    // When --all is set, the output must be a directory. Insert subdir + default name.
    const resolved = resolveOutputPath(
      'dist/legacy.mjs',
      serverOptions,
      'server',
    );
    const segments = resolved.split(path.sep);
    expect(segments[segments.length - 1]).toBe('flow.mjs');
    expect(segments[segments.length - 2]).toBe('server');
  });
});

describe('bundleCommand --all writes to dist/<flowName>/', () => {
  const tmpRoot: string = path.join(
    os.tmpdir(),
    `bundle-multi-flow-${Date.now()}`,
  );
  const configPath = path.join(tmpRoot, 'multi-flow.json');
  const outputDir = path.join(tmpRoot, 'dist');

  let exitSpy: jest.SpyInstance;

  const multiFlowConfig = {
    version: 4,
    flows: {
      web: {
        config: {
          platform: 'web',
          bundle: {
            packages: { '@walkeros/core': { imports: ['getId'] } },
          },
        },
      },
      server: {
        config: {
          platform: 'server',
          bundle: {
            packages: { '@walkeros/core': { imports: ['getId'] } },
          },
        },
      },
    },
  };

  beforeEach(async () => {
    await fs.ensureDir(tmpRoot);
    await fs.writeJson(configPath, multiFlowConfig);
    mockBundleCore.mockReset();
    mockBundleCore.mockImplementation(
      async (
        _flowSettings: unknown,
        buildOptions: BuildOptions,
      ): Promise<undefined> => {
        // Simulate bundler writing the file so the multi-flow loop can proceed.
        await fs.ensureDir(path.dirname(buildOptions.output));
        await fs.writeFile(buildOptions.output, '// stub bundle\n');
        return undefined;
      },
    );
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);
  });

  afterEach(async () => {
    exitSpy.mockRestore();
    await fs.remove(tmpRoot).catch(() => {});
  });

  it('writes each flow to <output>/<flowName>/<defaultFilename>', async () => {
    await bundleCommand({
      config: configPath,
      output: outputDir,
      all: true,
      silent: true,
    });

    expect(mockBundleCore).toHaveBeenCalledTimes(2);
    const outputs = mockBundleCore.mock.calls.map((call) => {
      const buildOptions = call[1] as BuildOptions;
      return buildOptions.output;
    });

    const expectedWeb = path.join(outputDir, 'web', 'walker.js');
    const expectedServer = path.join(outputDir, 'server', 'flow.mjs');

    expect(outputs).toEqual(
      expect.arrayContaining([expectedWeb, expectedServer]),
    );

    expect(await fs.pathExists(expectedWeb)).toBe(true);
    expect(await fs.pathExists(expectedServer)).toBe(true);
  });
});
