import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import path, { join } from 'path';
import { tmpdir } from 'os';
import { x as tarExtract } from 'tar';
import type { Flow } from '@walkeros/core';
import { bundle } from '../index.js';
import type { BuildOptions } from '../../../types/bundle.js';

jest.mock('../bundler.js', () => ({
  bundleCore: jest.fn(),
}));

import { bundleCore } from '../bundler.js';
const mockBundleCore = jest.mocked(bundleCore);

/**
 * Simulate what runNftServerPath produces: a directory-shaped node artifact
 * with flow.mjs + node_modules/ + package.json at dirname(output).
 */
function populateNodeArtifact(outputPath: string): void {
  const dir = path.dirname(outputPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(outputPath, 'export default function flow() {}\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'walkeros-bundle', type: 'module' }),
  );
  const pkgDir = join(dir, 'node_modules', 'demo-pkg');
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, 'index.js'), 'module.exports = {};\n');
}

/**
 * A fully-inlined node build: esbuild absorbed every dep, so nft copies no
 * files and no node_modules/ is created — only flow.mjs + package.json.
 */
function populateInlinedArtifact(outputPath: string): void {
  const dir = path.dirname(outputPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(outputPath, 'export default function flow() {}\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'walkeros-bundle', type: 'module' }),
  );
}

const serverConfig: Flow.Json = {
  version: 4,
  flows: {
    default: {
      sources: {
        http: { package: '@walkeros/server-source-express' },
      },
      destinations: {
        demo: { package: '@walkeros/destination-demo' },
      },
      config: {
        platform: 'server',
        bundle: {
          packages: { '@walkeros/server-source-express': {} },
        },
      },
    },
  },
};

const webConfig: Flow.Json = {
  version: 4,
  flows: {
    default: {
      config: {
        platform: 'web',
        bundle: { packages: { '@walkeros/core': { imports: ['getId'] } } },
      },
    },
  },
};

describe('bundle() packed-archive output', () => {
  let workDir: string;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    workDir = mkdtempSync(join(tmpdir(), 'walkeros-archive-it-'));
    mockBundleCore.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('produces a gzip tarball with flow.mjs + node_modules for a node flow', async () => {
    const outFile = join(workDir, 'flow.tar.gz');

    // bundleCore is redirected to a temp directory; populate it as the real
    // node build would, so packBundleDir has files to pack.
    mockBundleCore.mockImplementation(
      async (_flow: Flow, buildOptions: BuildOptions): Promise<undefined> => {
        populateNodeArtifact(buildOptions.output);
        return undefined;
      },
    );

    await bundle(serverConfig, {
      silent: true,
      buildOverrides: { output: outFile },
    });

    expect(existsSync(outFile)).toBe(true);
    const head = readFileSync(outFile).subarray(0, 2);
    expect(head[0]).toBe(0x1f);
    expect(head[1]).toBe(0x8b);

    // bundleCore must NOT have written directly to the .tar.gz path; it gets a
    // temp directory output instead.
    const usedOutput = mockBundleCore.mock.calls[0][1].output;
    expect(usedOutput).not.toBe(outFile);
    expect(usedOutput.endsWith('.tar.gz')).toBe(false);

    const extractDir = join(workDir, 'extracted');
    mkdirSync(extractDir, { recursive: true });
    await tarExtract({ cwd: extractDir, file: outFile });

    expect(existsSync(join(extractDir, 'flow.mjs'))).toBe(true);
    expect(existsSync(join(extractDir, 'package.json'))).toBe(true);
    expect(existsSync(join(extractDir, 'node_modules', 'demo-pkg'))).toBe(true);
    expect(
      readFileSync(join(extractDir, 'flow.mjs'), 'utf-8').includes(
        'export default',
      ),
    ).toBe(true);
  });

  it('packs a node flow with no node_modules into a valid tarball', async () => {
    const outFile = join(workDir, 'flow.tar.gz');
    mockBundleCore.mockImplementation(
      async (_flow: Flow, buildOptions: BuildOptions): Promise<undefined> => {
        populateInlinedArtifact(buildOptions.output);
        return undefined;
      },
    );

    await bundle(serverConfig, {
      silent: true,
      buildOverrides: { output: outFile },
    });

    expect(existsSync(outFile)).toBe(true);
    const head = readFileSync(outFile).subarray(0, 2);
    expect(head[0]).toBe(0x1f);
    expect(head[1]).toBe(0x8b);

    const extractDir = join(workDir, 'extracted-inlined');
    mkdirSync(extractDir, { recursive: true });
    await tarExtract({ cwd: extractDir, file: outFile });

    expect(existsSync(join(extractDir, 'flow.mjs'))).toBe(true);
    expect(existsSync(join(extractDir, 'package.json'))).toBe(true);
    expect(existsSync(join(extractDir, 'node_modules'))).toBe(false);
  });

  it('cleans up the temp build dir after packing', async () => {
    const outFile = join(workDir, 'flow.tgz');
    let usedDir = '';
    mockBundleCore.mockImplementation(
      async (_flow: Flow, buildOptions: BuildOptions): Promise<undefined> => {
        usedDir = path.dirname(buildOptions.output);
        populateNodeArtifact(buildOptions.output);
        return undefined;
      },
    );

    await bundle(serverConfig, {
      silent: true,
      buildOverrides: { output: outFile },
    });

    expect(existsSync(outFile)).toBe(true);
    expect(usedDir).not.toBe('');
    expect(existsSync(usedDir)).toBe(false);
  });

  it('throws when a web flow targets a .tar.gz output', async () => {
    const outFile = join(workDir, 'walker.tar.gz');

    await expect(
      bundle(webConfig, {
        silent: true,
        buildOverrides: { output: outFile },
      }),
    ).rejects.toThrow(/archive|web|tar\.gz/i);

    expect(mockBundleCore).not.toHaveBeenCalled();
  });

  it('leaves .mjs output untouched (no archive packing)', async () => {
    const outFile = join(workDir, 'flow.mjs');
    mockBundleCore.mockResolvedValue(undefined);

    await bundle(serverConfig, {
      silent: true,
      buildOverrides: { output: outFile },
    });

    // bundleCore receives the .mjs path directly — no temp redirect.
    expect(mockBundleCore.mock.calls[0][1].output).toBe(outFile);
  });
});
