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
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'step-loader-entry-'));
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  async function writePkg(pkgJson: Record<string, unknown>, files: string[]) {
    await fs.writeJson(path.join(dir, 'package.json'), pkgJson);
    for (const f of files) {
      await fs.ensureFile(path.join(dir, f));
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
      'module field',
      { module: './dist/index.mjs', main: './dist/index.js' },
      'dist/index.mjs',
    ],
    ['main field', { main: './dist/index.js' }, 'dist/index.js'],
  ])('resolves %s', async (_label, pkgJson, expected) => {
    await writePkg({ name: 'x', ...pkgJson }, [expected]);
    await expect(resolvePackageEntry(dir)).resolves.toBe(
      path.join(dir, expected),
    );
  });

  it('rejects a missing package.json with a clear error', async () => {
    await expect(resolvePackageEntry(dir)).rejects.toThrow(/package\.json/);
  });

  it('rejects a TypeScript entry (setup imports with Node, not esbuild)', async () => {
    await writePkg({ name: 'x', main: './index.ts' }, ['index.ts']);
    await expect(resolvePackageEntry(dir)).rejects.toThrow(/built package/);
  });

  it('rejects when the resolved entry file does not exist', async () => {
    await writePkg({ name: 'x', main: './dist/index.js' }, []);
    await expect(resolvePackageEntry(dir)).rejects.toThrow(/dist\/index\.js/);
  });
});

describe('loadStepPackage', () => {
  let fixtureDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedNpmConfig.mockResolvedValue({
      registry: 'https://registry.npmjs.org/',
    });
    // Real fixture package: acquisition is mocked, the import is real.
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
    mockedDownload.mockResolvedValue({
      packagePaths: new Map([['@walkeros/fixture-dest', fixtureDir]]),
      resolution: { topLevel: new Map(), nested: [] },
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
    await loadStepPackage(pinnedFlow, 'destination', 'd', { logger });
    expect(mockedDownload).toHaveBeenCalledTimes(1);
    const [packages, , , useCache, , , overrides] =
      mockedDownload.mock.calls[0];
    expect(packages).toEqual([
      { name: '@walkeros/fixture-dest', version: '4.4.0' },
    ]);
    expect(useCache).toBe(true);
    expect(overrides).toEqual({ arrify: '2.0.1' });
  });

  it('defaults an unpinned package to latest, exactly like bundle', async () => {
    const flow: Flow = {
      config: { platform: 'server' },
      destinations: { d: { package: '@walkeros/fixture-dest', config: {} } },
    };
    await loadStepPackage(flow, 'destination', 'd', { logger });
    const [packages] = mockedDownload.mock.calls[0];
    expect(packages).toEqual([
      { name: '@walkeros/fixture-dest', version: 'latest' },
    ]);
  });

  it('imports the extracted entry and returns the module namespace', async () => {
    const loaded = await loadStepPackage(pinnedFlow, 'destination', 'd', {
      logger,
    });
    expect(loaded.packageName).toBe('@walkeros/fixture-dest');
    expect(loaded.packageDir).toBe(fixtureDir);
    const def = loaded.module.default;
    expect(def).toMatchObject({ type: 'fixture' });
  });

  it('wraps acquisition failures with an offline/path hint', async () => {
    mockedDownload.mockRejectedValue(
      new Error('Failed to download @walkeros/fixture-dest@4.4.0: ENOTFOUND'),
    );
    await expect(
      loadStepPackage(pinnedFlow, 'destination', 'd', { logger }),
    ).rejects.toThrow(/registry.*offline|offline.*registry/i);
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
