import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import {
  resolveStepPackage,
  resolvePackageEntry,
  loadStepPackage,
} from '../step-loader';
import * as packageManager from '../package-manager';
import { createMockLogger } from '../../__tests__/helpers/mock-logger.js';

jest.mock('../package-manager', () => {
  const actual = jest.requireActual('../package-manager');
  return {
    ...actual,
    loadNpmConfigForPacote: jest.fn(),
    downloadPackagesWithResolution: jest.fn(),
  };
});

const mockedDownload = jest.mocked(
  packageManager.downloadPackagesWithResolution,
);
const mockedNpmConfig = jest.mocked(packageManager.loadNpmConfigForPacote);

const logger = createMockLogger();

function flowWith(overrides: Partial<Flow>): Flow {
  return { config: { platform: 'server' }, ...overrides };
}

describe('resolveStepPackage', () => {
  it('returns the version pinned in config.bundle.packages', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/server-destination-gcp': { version: '4.4.0' },
          },
        },
      },
      destinations: {
        bigquery: { package: '@walkeros/server-destination-gcp', config: {} },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(result.packageName).toBe('@walkeros/server-destination-gcp');
    expect(result.spec.version).toBe('4.4.0');
  });

  it('uses an inline step version when no bundle pin exists', () => {
    const flow = flowWith({
      destinations: {
        bigquery: {
          package: '@walkeros/server-destination-gcp@4.3.0',
          config: {},
        },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(result.packageName).toBe('@walkeros/server-destination-gcp');
    expect(result.spec.version).toBe('4.3.0');
  });

  it('prefers the bundle pin over a disagreeing inline version', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/server-destination-gcp': { version: '4.4.0' },
          },
        },
      },
      destinations: {
        bigquery: {
          package: '@walkeros/server-destination-gcp@4.3.0',
          config: {},
        },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(result.spec.version).toBe('4.4.0');
  });

  it('carries a path entry through', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: { packages: { 'my-dest': { path: './pkgs/my-dest' } } },
      },
      destinations: { d: { package: 'my-dest', config: {} } },
    });
    const result = resolveStepPackage(flow, 'destination', 'd', logger);
    expect(result.spec.path).toBe('./pkgs/my-dest');
  });

  it('does not mutate the input flow and rewrites the clone to bare names', () => {
    const flow = flowWith({
      destinations: {
        bigquery: {
          package: '@walkeros/server-destination-gcp@4.3.0',
          config: {},
        },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'bigquery', logger);
    expect(flow.destinations?.bigquery?.package).toBe(
      '@walkeros/server-destination-gcp@4.3.0',
    );
    expect(result.normalizedFlow.destinations?.bigquery?.package).toBe(
      '@walkeros/server-destination-gcp',
    );
  });

  it('surfaces overrides from config.bundle.overrides', () => {
    const flow = flowWith({
      config: {
        platform: 'server',
        bundle: { overrides: { '@amplitude/analytics-types': '2.11.1' } },
      },
      destinations: {
        d: { package: '@walkeros/web-destination-api', config: {} },
      },
    });
    const result = resolveStepPackage(flow, 'destination', 'd', logger);
    expect(result.overrides).toEqual({
      '@amplitude/analytics-types': '2.11.1',
    });
  });

  it('throws when the step does not exist', () => {
    expect(() =>
      resolveStepPackage(flowWith({}), 'destination', 'missing', logger),
    ).toThrow(/missing/);
  });

  it('throws when the step has inline code instead of a package', () => {
    const flow = flowWith({
      destinations: { d: { code: { push: '$code:() => {}' }, config: {} } },
    });
    expect(() => resolveStepPackage(flow, 'destination', 'd', logger)).toThrow(
      /package/,
    );
  });
});

describe('resolvePackageEntry', () => {
  let treeDir: string;
  let pkgDir: string;

  beforeEach(async () => {
    treeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'step-loader-entry-'));
    pkgDir = path.join(treeDir, 'node_modules', 'x');
    await fs.ensureDir(pkgDir);
  });

  afterEach(async () => {
    await fs.remove(treeDir);
  });

  async function writePkg(pkgJson: Record<string, unknown>, files: string[]) {
    await fs.writeJson(path.join(pkgDir, 'package.json'), pkgJson);
    for (const f of files) {
      await fs.ensureFile(path.join(pkgDir, f));
    }
  }

  it.each([
    ['exports as string', { exports: './dist/index.mjs' }, 'dist/index.mjs'],
    [
      'exports dot string',
      { exports: { '.': './dist/index.mjs' } },
      'dist/index.mjs',
    ],
    [
      'exports dot conditions',
      {
        exports: {
          '.': { import: './dist/index.mjs', require: './dist/index.js' },
        },
      },
      'dist/index.mjs',
    ],
    [
      'nested import condition',
      { exports: { '.': { import: { default: './dist/index.mjs' } } } },
      'dist/index.mjs',
    ],
    [
      'node condition declared before default',
      {
        exports: { '.': { node: './dist/node.js', default: './dist/def.js' } },
      },
      'dist/node.js',
    ],
    [
      'default condition declared before node',
      {
        exports: { '.': { default: './dist/def.js', node: './dist/node.js' } },
      },
      'dist/def.js',
    ],
    [
      'export array, skipping invalid targets',
      { exports: { '.': ['invalid-target', './dist/ok.js'] } },
      'dist/ok.js',
    ],
    ['main field', { main: './dist/index.js' }, 'dist/index.js'],
    [
      'main over module (Node never reads module)',
      { module: './dist/index.mjs', main: './dist/index.js' },
      'dist/index.js',
    ],
  ])('resolves %s', async (_label, pkgJson, expected) => {
    await writePkg({ name: 'x', ...pkgJson }, [expected]);
    await expect(resolvePackageEntry(pkgDir, 'x')).resolves.toBe(
      path.join(pkgDir, expected),
    );
  });

  it('rejects a blocked root export instead of falling back to main', async () => {
    await writePkg(
      {
        name: 'x',
        exports: { '.': null },
        module: './m.js',
        main: './main.js',
      },
      ['m.js', 'main.js'],
    );
    await expect(resolvePackageEntry(pkgDir, 'x')).rejects.toThrow(/exports/);
  });

  it('rejects a require-only exports root, matching Node import()', async () => {
    await writePkg({ name: 'x', exports: { '.': { require: './index.js' } } }, [
      'index.js',
    ]);
    await expect(resolvePackageEntry(pkgDir, 'x')).rejects.toThrow(/exports/);
  });

  it('rejects a missing package.json with a clear error', async () => {
    await expect(resolvePackageEntry(pkgDir, 'x')).rejects.toThrow(
      /package\.json/,
    );
  });

  it('rejects a TypeScript entry (setup imports with Node, not esbuild)', async () => {
    await writePkg({ name: 'x', main: './index.ts' }, ['index.ts']);
    await expect(resolvePackageEntry(pkgDir, 'x')).rejects.toThrow(
      /built package/,
    );
  });

  it('rejects when an exports-declared entry file does not exist', async () => {
    await writePkg({ name: 'x', exports: './dist/index.mjs' }, []);
    await expect(resolvePackageEntry(pkgDir, 'x')).rejects.toThrow(
      /dist\/index\.mjs/,
    );
  });

  it('rejects when the main entry file does not exist', async () => {
    await writePkg({ name: 'x', main: './dist/index.js' }, []);
    await expect(resolvePackageEntry(pkgDir, 'x')).rejects.toThrow(
      /dist\/index\.js/,
    );
  });

  it('removes its probe file after resolving', async () => {
    await writePkg({ name: 'x', main: './index.js' }, ['index.js']);
    await resolvePackageEntry(pkgDir, 'x');
    const entries = await fs.readdir(pkgDir);
    expect(entries.sort()).toEqual(['index.js', 'package.json']);
  });
});

describe('loadStepPackage', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedNpmConfig.mockResolvedValue({
      registry: 'https://registry.npmjs.org/',
    });
    // Real fixture package: acquisition is mocked but installs a real tree
    // in the production layout (installDir/node_modules/<name>), and the
    // entry resolution and import are real.
    fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'step-loader-pkg-'));
    await fs.writeJson(path.join(fixtureDir, 'package.json'), {
      name: '@walkeros/fixture-dest',
      version: '4.4.0',
      main: './index.mjs',
    });
    await fs.writeFile(
      path.join(fixtureDir, 'index.mjs'),
      'export default { type: "fixture", push: () => {}, setup: async () => ({ ok: true }) };\n',
    );
    mockedDownload.mockImplementation(async (_packages, targetDir) => {
      const packageDir = path.join(
        targetDir,
        'node_modules',
        '@walkeros/fixture-dest',
      );
      await fs.copy(fixtureDir, packageDir);
      return {
        packagePaths: new Map([['@walkeros/fixture-dest', packageDir]]),
        resolution: { topLevel: new Map(), nested: [] },
      };
    });
  });

  afterEach(async () => {
    await fs.remove(fixtureDir);
  });

  const pinnedFlow: Flow = {
    config: {
      platform: 'server',
      bundle: {
        packages: { '@walkeros/fixture-dest': { version: '4.4.0' } },
        overrides: { arrify: '2.0.1' },
      },
    },
    destinations: { d: { package: '@walkeros/fixture-dest', config: {} } },
  };

  it('passes the flow-pinned version to the shared acquisition pipeline', async () => {
    const loaded = await loadStepPackage(pinnedFlow, 'destination', 'd', {
      logger,
    });
    try {
      expect(mockedDownload).toHaveBeenCalledTimes(1);
      const [packages, , , useCache, , , overrides] =
        mockedDownload.mock.calls[0];
      expect(packages).toEqual([
        { name: '@walkeros/fixture-dest', version: '4.4.0' },
      ]);
      expect(useCache).toBe(true);
      expect(overrides).toEqual({ arrify: '2.0.1' });
    } finally {
      await fs.remove(loaded.installDir);
    }
  });

  it('defaults an unpinned package to latest, exactly like bundle', async () => {
    const flow: Flow = {
      config: { platform: 'server' },
      destinations: { d: { package: '@walkeros/fixture-dest', config: {} } },
    };
    const loaded = await loadStepPackage(flow, 'destination', 'd', { logger });
    try {
      const [packages] = mockedDownload.mock.calls[0];
      expect(packages).toEqual([
        { name: '@walkeros/fixture-dest', version: 'latest' },
      ]);
    } finally {
      await fs.remove(loaded.installDir);
    }
  });

  it('imports the extracted entry and returns the module namespace', async () => {
    const loaded = await loadStepPackage(pinnedFlow, 'destination', 'd', {
      logger,
    });
    try {
      expect(loaded.packageName).toBe('@walkeros/fixture-dest');
      expect(loaded.packageDir).toBe(
        path.join(loaded.installDir, 'node_modules', '@walkeros/fixture-dest'),
      );
      const def = loaded.module.default;
      expect(def).toMatchObject({ type: 'fixture' });
    } finally {
      await fs.remove(loaded.installDir);
    }
  });

  it('wraps acquisition failures with an offline/path hint', async () => {
    mockedDownload.mockRejectedValue(
      new Error('Failed to download @walkeros/fixture-dest@4.4.0: ENOTFOUND'),
    );
    await expect(
      loadStepPackage(pinnedFlow, 'destination', 'd', { logger }),
    ).rejects.toThrow(/registry.*offline|offline.*registry/i);
  });

  it('allocates a distinct install dir per concurrent load', async () => {
    const [a, b] = await Promise.all([
      loadStepPackage(pinnedFlow, 'destination', 'd', { logger }),
      loadStepPackage(pinnedFlow, 'destination', 'd', { logger }),
    ]);
    try {
      expect(a.installDir).not.toBe(b.installDir);
    } finally {
      await fs.remove(a.installDir);
      await fs.remove(b.installDir);
    }
  });

  it('errors when the resolved tree misses the requested package', async () => {
    mockedDownload.mockResolvedValue({
      packagePaths: new Map(),
      resolution: { topLevel: new Map(), nested: [] },
    });
    await expect(
      loadStepPackage(pinnedFlow, 'destination', 'd', { logger }),
    ).rejects.toThrow(/@walkeros\/fixture-dest/);
  });
});
