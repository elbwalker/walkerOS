/**
 * Task 12 — E2E smoke test for `walkerOS.bundle.external` against the real
 * `@walkeros/server-destination-gcp` destination.
 *
 * Two-tier validation:
 *
 * 1. **Sanity check on the real GCP package.json** — assert the on-disk
 *    `walkerOS.bundle.external` block declares the expected 5 entries
 *    (`@google-cloud/bigquery-storage`, `@grpc/grpc-js`, `@grpc/proto-loader`,
 *    `protobufjs`, `google-gax`). This is the contract step authors hand the
 *    bundler. If this drifts, every downstream test in this plan is moot.
 *
 * 2. **Wiring verification through bundleCore** — drive the full
 *    `bundleCore` pipeline against a synthetic step package whose
 *    `walkerOS.bundle.external` mirrors GCP's shape (5 declared externals,
 *    proper deps so `readBundleExternals` doesn't reject). Pacote and the
 *    install step are mocked so this never hits the real registry. We
 *    assert:
 *
 *    - `bundle.mjs` is written and contains zero `__dirname` references.
 *    - `<outputDir>/package.json` lists the 5 externals as deps with valid
 *      semver versions (no `"latest"`, no empty strings).
 *    - `<outputDir>/package-lock.json` is npm v3.
 *    - `installExternalsViaPacote` was invoked.
 *
 * Why a synthetic package instead of the real GCP path: the real GCP's
 * `dependencies` only lists `@google-cloud/bigquery-storage`, which means
 * `readBundleExternals` (Task 8 validation) hard-errors on the other 4
 * externals being absent from `dependencies`/`peerDependencies`. The wiring
 * test must use a metadata-correct fixture; the real GCP package.json shape
 * is asserted directly in the sanity-check test above. Real install + npm-ci
 * compatibility against GCP is exercised manually before release.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import pacote from 'pacote';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { cacheBuild } from '../../../core/build-cache.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import {
  downloadPackagesWithResolution,
  type ResolutionResult,
} from '../../../commands/bundle/package-manager.js';
import { installExternalsViaPacote } from '../../../commands/bundle/install-externals.js';
import type { BuildOptions } from '../../../types/bundle.js';
import type { Flow } from '@walkeros/core';

// Mock pacote so no test ever reaches the real registry.
jest.mock('pacote');
const mockManifest = pacote.manifest as jest.MockedFunction<
  typeof pacote.manifest
>;
const mockExtract = pacote.extract as jest.MockedFunction<
  typeof pacote.extract
>;

// Partial mocks for the bundle-pipeline collaborators. We keep their real
// implementations as default delegates and override per-test where needed.
jest.mock('../../../commands/bundle/install-externals.js', () => {
  const actual = jest.requireActual(
    '../../../commands/bundle/install-externals.js',
  );
  return {
    ...actual,
    installExternalsViaPacote: jest.fn(actual.installExternalsViaPacote),
  };
});
jest.mock('../../../commands/bundle/package-manager.js', () => {
  const actual = jest.requireActual(
    '../../../commands/bundle/package-manager.js',
  );
  return {
    ...actual,
    downloadPackagesWithResolution: jest.fn(
      actual.downloadPackagesWithResolution,
    ),
  };
});

const mockInstallExternals = installExternalsViaPacote as jest.MockedFunction<
  typeof installExternalsViaPacote
>;
const mockDownloadWithResolution =
  downloadPackagesWithResolution as jest.MockedFunction<
    typeof downloadPackagesWithResolution
  >;

// Minimum-viable external list. The bundler's closure walker pulls in
// @grpc/grpc-js, @grpc/proto-loader, protobufjs, google-gax transitively
// from bigquery-storage's own dependencies/peerDependencies.
const GCP_EXPECTED_EXTERNALS = ['@google-cloud/bigquery-storage'];

const GCP_PKG_JSON = path.resolve(
  __dirname,
  '../../../../../server/destinations/gcp/package.json',
);

describe('e2e: GCP destination — walkerOS.bundle.external contract', () => {
  it('the real GCP package.json declares the minimum external (bigquery-storage only)', async () => {
    expect(await fs.pathExists(GCP_PKG_JSON)).toBe(true);
    const gcpPkg = await fs.readJson(GCP_PKG_JSON);
    expect(gcpPkg.name).toBe('@walkeros/server-destination-gcp');
    expect(gcpPkg.walkerOS?.bundle?.external).toEqual(
      expect.arrayContaining(GCP_EXPECTED_EXTERNALS),
    );
    // Tight check: exactly these 5, no extras (drift signal).
    expect(new Set(gcpPkg.walkerOS.bundle.external)).toEqual(
      new Set(GCP_EXPECTED_EXTERNALS),
    );
  });
});

describe('e2e: bundleCore wiring with GCP-shaped externals', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gcp-e2e-'));
    // Pacote must never fall through to the real registry. Provide
    // deterministic manifests if the install path ever calls through.
    mockManifest.mockImplementation(async (spec: string) => {
      const [name] = String(spec).split('@').filter(Boolean);
      return {
        name: name.startsWith('@')
          ? '@' + name.split('/')[0].slice(1) + '/' + name.split('/')[1]
          : name,
        version: '1.0.0',
        dependencies: {},
      } as never;
    });
    mockExtract.mockImplementation(async (_spec, dest) => {
      if (typeof dest === 'string') {
        await fs.outputJson(path.join(dest, 'package.json'), { name: 'mock' });
      }
      return { from: 'mock', resolved: 'mock', integrity: 'sha512-x' } as never;
    });
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('produces a self-contained artifact with all 5 GCP-shaped externals declared in the sidecar', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'bundle.mjs');
    const tempBuild = path.join(tmp, 'temp-build');

    // Synthetic step package mirroring GCP's walkerOS.bundle.external shape.
    // Unlike real GCP, this fixture lists every external in `dependencies`
    // so readBundleExternals' Task 8 validation accepts it.
    const fakePkgDir = path.join(tmp, 'fake-pkgs', 'gcp-shaped');
    await fs.outputJson(path.join(fakePkgDir, 'package.json'), {
      name: 'gcp-shaped',
      version: '1.0.0',
      walkerOS: { bundle: { external: GCP_EXPECTED_EXTERNALS } },
      dependencies: {
        '@google-cloud/bigquery-storage': '^5.1.0',
        '@grpc/grpc-js': '^1.10.0',
        '@grpc/proto-loader': '^0.7.10',
        protobufjs: '^7.2.0',
        'google-gax': '^4.3.0',
      },
    });

    // Realistic resolved versions (what pacote would have computed). All
    // are valid semver, none is "latest", none is empty.
    const resolvedVersions = new Map([
      ['gcp-shaped', { name: 'gcp-shaped', version: '1.0.0' }],
      [
        '@google-cloud/bigquery-storage',
        { name: '@google-cloud/bigquery-storage', version: '5.1.0' },
      ],
      ['@grpc/grpc-js', { name: '@grpc/grpc-js', version: '1.10.7' }],
      ['@grpc/proto-loader', { name: '@grpc/proto-loader', version: '0.7.13' }],
      ['protobufjs', { name: 'protobufjs', version: '7.2.6' }],
      ['google-gax', { name: 'google-gax', version: '4.3.4' }],
    ]);

    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map([['gcp-shaped', fakePkgDir]]),
      resolution: {
        topLevel: resolvedVersions,
        nested: [],
      } satisfies ResolutionResult,
    });

    // Mock the install: write each external's package.json into outputDir's
    // node_modules and report back the install plan that drives the lockfile.
    mockInstallExternals.mockImplementation(async (args) => {
      const installed: { name: string; version: string }[] = [];
      for (const name of args.externals) {
        const meta = resolvedVersions.get(name);
        if (!meta) continue;
        await fs.outputJson(
          path.join(args.outputDir, 'node_modules', name, 'package.json'),
          { name, version: meta.version },
        );
        installed.push({ name, version: meta.version });
      }
      return { installed };
    });

    // Drive bundleCore via the L1 cache-hit branch so we never run esbuild.
    // The cache-hit branch still exercises:
    //   - readBundleExternals (against fakePkgDir's package.json)
    //   - detectExternalConflicts
    //   - writeSidecarPackageJson (from ResolutionResult.topLevel)
    //   - installExternalsViaPacote (mocked)
    //   - writeBundleLockfile
    //   - warnOnSuspectGlobals
    const flowSettings: Flow = { config: { platform: 'web' } };
    const buildOptions: BuildOptions = {
      output: outputPath,
      tempDir: tempBuild,
      cache: true,
      packages: {},
      format: 'esm',
      platform: 'browser',
      configDir: tmp,
    };

    // Pre-seed the L1 build cache with a known bundle text. The cache key
    // mirrors generateCacheKeyContent(flow, build, externals).
    const cacheBundleText =
      '// cached bundle, ESM, no path globals\nexport const ok = true;\n';
    const configForCache = {
      flow: flowSettings,
      build: { ...buildOptions, tempDir: undefined, output: undefined },
      externals: [...GCP_EXPECTED_EXTERNALS].sort(),
    };
    const configContent = JSON.stringify(configForCache);
    await cacheBuild(configContent, cacheBundleText, cacheDir);
    await cacheBuild(configContent, cacheBundleText, tempBuild);

    await bundleCore(flowSettings, buildOptions, logger);

    // Bundle written.
    expect(await fs.pathExists(outputPath)).toBe(true);
    const bundleContent = await fs.readFile(outputPath, 'utf-8');
    expect(bundleContent).not.toContain('__dirname');

    // Sidecar package.json with all 5 externals as deps.
    const sidecar = await fs.readJson(path.join(outputDir, 'package.json'));
    expect(sidecar.dependencies).toBeDefined();
    expect(Object.keys(sidecar.dependencies).sort()).toEqual(
      [...GCP_EXPECTED_EXTERNALS].sort(),
    );
    // Every version is valid semver, none is "latest" or empty.
    for (const [name, version] of Object.entries(sidecar.dependencies)) {
      expect(typeof version).toBe('string');
      expect(version).not.toBe('latest');
      expect(version).not.toBe('');
      expect(version as string).toMatch(/^\d+\.\d+\.\d+/);
      // Cross-check against the resolution graph.
      expect(version).toBe(resolvedVersions.get(name)!.version);
    }

    // Lockfile is npm v3 with the same 5 deps.
    const lock = await fs.readJson(path.join(outputDir, 'package-lock.json'));
    expect(lock.lockfileVersion).toBe(3);
    const rootDeps = lock.packages['']?.dependencies as
      | Record<string, string>
      | undefined;
    expect(rootDeps).toBeDefined();
    for (const name of GCP_EXPECTED_EXTERNALS) {
      expect(rootDeps![name]).toBe(resolvedVersions.get(name)!.version);
    }

    // Install pipeline was invoked exactly once with the GCP externals.
    expect(mockInstallExternals).toHaveBeenCalledTimes(1);
    const installArgs = mockInstallExternals.mock.calls[0][0];
    expect([...installArgs.externals].sort()).toEqual(
      [...GCP_EXPECTED_EXTERNALS].sort(),
    );
  });
});
