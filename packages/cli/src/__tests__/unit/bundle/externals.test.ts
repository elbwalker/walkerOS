import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import pacote from 'pacote';
import {
  bundleCore,
  detectExternalConflicts,
  readBundleExternals,
  warnOnSuspectGlobals,
  writeSidecarPackageJson,
} from '../../../commands/bundle/bundler.js';
import { cacheBuild, getCodeCachePath } from '../../../core/build-cache.js';
import type { CodeCacheKeyInputs } from '../../../core/build-cache.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import {
  assertNoPostinstallScripts,
  downloadPackagesWithResolution,
  loadNpmConfigForPacote,
} from '../../../commands/bundle/package-manager.js';
import type { ResolutionResult } from '../../../commands/bundle/package-manager.js';
import { installExternalsViaPacote } from '../../../commands/bundle/install-externals.js';
import type { BuildOptions } from '../../../types/bundle.js';
import type { Flow } from '@walkeros/core';

// Pacote is mocked at the file level so the install-externals tests can
// drive `manifest`/`extract` outcomes without hitting the real registry.
// The other suites in this file don't call pacote, so the mock is inert
// for them.
jest.mock('pacote');
const mockManifest = pacote.manifest as jest.MockedFunction<
  typeof pacote.manifest
>;
const mockExtract = pacote.extract as jest.MockedFunction<
  typeof pacote.extract
>;

// Partial mocks: keep the real implementations as default delegates so the
// existing direct-call tests still work, but allow the end-to-end suite below
// to override behavior via `mockImplementation`.
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

/**
 * Tests for the per-package externals mechanism. Step packages declare runtime
 * deps that cannot be ESM-bundled (e.g. `@google-cloud/bigquery-storage` and
 * its `__dirname`-using gRPC stack) via `walkerOS.bundle.external` in their
 * package.json. The bundler reads these, externalizes them, and writes a
 * sidecar package.json next to the bundle so deploy-time `npm ci --omit=dev`
 * provides them at runtime.
 */
describe('walkerOS.bundle.external — readBundleExternals helper', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rbe-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('returns empty set when no installed package declares walkerOS.bundle.external', async () => {
    const pkgDir = path.join(tmp, 'node_modules', 'foo');
    await fs.outputJson(path.join(pkgDir, 'package.json'), {
      name: 'foo',
      version: '1.0.0',
    });
    const result = await readBundleExternals(new Map([['foo', pkgDir]]));
    expect(result.union).toEqual(new Set());
  });

  it('reads and unions externals across multiple packages', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    const b = path.join(tmp, 'node_modules', 'b');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerOS: { bundle: { external: ['x', 'y'] } },
      dependencies: { x: '^1.0.0', y: '^1.0.0' },
    });
    await fs.outputJson(path.join(b, 'package.json'), {
      name: 'b',
      version: '1.0.0',
      walkerOS: { bundle: { external: ['y', 'z'] } },
      dependencies: { y: '^1.0.0', z: '^1.0.0' },
    });
    const result = await readBundleExternals(
      new Map([
        ['a', a],
        ['b', b],
      ]),
    );
    expect(result.union).toEqual(new Set(['x', 'y', 'z']));
  });

  it('ignores malformed walkerOS.bundle (non-array external)', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerOS: { bundle: { external: 'not-an-array' } },
    });
    const result = await readBundleExternals(new Map([['a', a]]));
    expect(result.union).toEqual(new Set());
  });

  it('skips packages whose package.json is missing or unreadable', async () => {
    const missing = path.join(tmp, 'does-not-exist');
    const result = await readBundleExternals(new Map([['ghost', missing]]));
    expect(result.union).toEqual(new Set());
  });

  it('skips empty strings and non-string entries in the array', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerOS: { bundle: { external: ['valid', '', 42, null, 'also-valid'] } },
      dependencies: { valid: '^1.0.0', 'also-valid': '^1.0.0' },
    });
    const result = await readBundleExternals(new Map([['a', a]]));
    expect(result.union).toEqual(new Set(['valid', 'also-valid']));
  });
});

describe('readBundleExternals validation', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rbe-validation-'));
  });
  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('hard-errors when an external is named but missing from dependencies AND peerDependencies', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerOS: { bundle: { external: ['foo'] } },
      // No dependencies or peerDependencies entry for foo.
    });
    await expect(readBundleExternals(new Map([['a', a]]))).rejects.toThrow(
      /Package a declares "foo" in walkerOS\.bundle\.external but does not list it in dependencies or peerDependencies/,
    );
  });

  it('uses peerDependencies spec when external is in both deps and peerDeps', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerOS: { bundle: { external: ['foo'] } },
      dependencies: { foo: '^1' },
      peerDependencies: { foo: '^2' },
    });
    const result = await readBundleExternals(new Map([['a', a]]));
    expect(result.declarations).toHaveLength(1);
    expect(result.declarations[0].spec).toBe('^2');
  });

  it('warns on unknown walkerOS.bundle keys (typo guard)', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerOS: { bundle: { externals: ['foo'] } }, // typo: plural
    });
    const result = await readBundleExternals(new Map([['a', a]]));
    expect(result.warnings.some((w) => /externals/.test(w))).toBe(true);
  });
});

describe('cross-consumer version conflict detection', () => {
  it('hard-errors when resolved version does not satisfy any consumer constraint', () => {
    const decls = [
      { external: 'foo', consumer: 'pkg-a', spec: '^1.0.0' },
      { external: 'foo', consumer: 'pkg-b', spec: '^2.0.0' },
    ];
    const resolved = new Map([['foo', '1.5.0']]);
    expect(() => detectExternalConflicts(decls, resolved)).toThrow(
      /walkerOS\.bundle\.external version conflict/,
    );
  });

  it('error message lists ALL consumers in one block (no pairwise spam)', () => {
    const decls = [
      { external: 'foo', consumer: 'pkg-a', spec: '^1.0.0' },
      { external: 'foo', consumer: 'pkg-b', spec: '^2.0.0' },
      { external: 'foo', consumer: 'pkg-c', spec: '^3.0.0' },
    ];
    const resolved = new Map([['foo', '2.5.0']]);
    let msg = '';
    try {
      detectExternalConflicts(decls, resolved);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('foo');
    expect(msg).toContain('pkg-a');
    expect(msg).toContain('pkg-b');
    expect(msg).toContain('pkg-c');
    expect((msg.match(/external "foo"/g) ?? []).length).toBe(1);
    expect(msg).toContain('walkerOS.bundle.external');
    expect(msg).toContain("Bump one consumer's `dependencies.foo`");
  });

  it('passes when resolved version satisfies all consumer constraints', () => {
    const decls = [
      { external: 'foo', consumer: 'pkg-a', spec: '^1.0.0' },
      { external: 'foo', consumer: 'pkg-b', spec: '^1.5.0' },
    ];
    const resolved = new Map([['foo', '1.7.0']]);
    expect(() => detectExternalConflicts(decls, resolved)).not.toThrow();
  });

  it('passes when consumers do not share externals', () => {
    const decls = [
      { external: 'foo', consumer: 'pkg-a', spec: '^1.0.0' },
      { external: 'bar', consumer: 'pkg-b', spec: '^2.0.0' },
    ];
    const resolved = new Map([
      ['foo', '1.0.0'],
      ['bar', '2.0.0'],
    ]);
    expect(() => detectExternalConflicts(decls, resolved)).not.toThrow();
  });
});

describe('sidecar version lookup via resolution graph', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'side-rg-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('reads version from ResolutionResult.topLevel when present', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');
    const resolution: ResolutionResult = {
      topLevel: new Map([['foo', { name: 'foo', version: '1.2.3' }]]),
      nested: [],
    };
    await writeSidecarPackageJson(
      outputPath,
      new Set(['foo']),
      logger,
      resolution,
    );
    const sidecar = await fs.readJson(path.join(outputDir, 'package.json'));
    expect(sidecar.dependencies.foo).toEqual('1.2.3');
  });

  it('reads from ResolutionResult.nested when external is not at top level', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');
    const resolution: ResolutionResult = {
      topLevel: new Map(),
      nested: [{ name: 'foo', version: '1.2.3', consumers: ['pkg-a'] }],
    };
    await writeSidecarPackageJson(
      outputPath,
      new Set(['foo']),
      logger,
      resolution,
    );
    const sidecar = await fs.readJson(path.join(outputDir, 'package.json'));
    expect(sidecar.dependencies.foo).toEqual('1.2.3');
  });

  it('warns and omits when external is not in the resolution graph', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');
    const warnSpy = jest.fn();
    const customLogger = { ...logger, warn: warnSpy };
    await writeSidecarPackageJson(
      outputPath,
      new Set(['foo']),
      customLogger as never,
      { topLevel: new Map(), nested: [] },
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('foo'));
    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
  });
});

describe('walkerOS.bundle.external — writeSidecarPackageJson', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sidecar-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('writes sidecar package.json with resolved versions when externals exist', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    const resolution: ResolutionResult = {
      topLevel: new Map([
        ['pkg-a', { name: 'pkg-a', version: '2.3.4' }],
        ['pkg-b', { name: 'pkg-b', version: '0.5.1-rc.0' }],
      ]),
      nested: [],
    };

    await writeSidecarPackageJson(
      outputPath,
      new Set(['pkg-a', 'pkg-b']),
      logger,
      resolution,
    );

    const sidecar = await fs.readJson(path.join(outputDir, 'package.json'));
    expect(sidecar).toMatchObject({
      name: 'walkeros-bundle',
      private: true,
      type: 'module',
      dependencies: { 'pkg-a': '2.3.4', 'pkg-b': '0.5.1-rc.0' },
    });
  });

  it('does not write sidecar when externals set is empty', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    await writeSidecarPackageJson(outputPath, new Set(), logger, {
      topLevel: new Map(),
      nested: [],
    });

    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
  });

  it('omits externals not present in resolution graph but still writes sidecar if any resolve', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    const resolution: ResolutionResult = {
      topLevel: new Map([['pkg-a', { name: 'pkg-a', version: '1.0.0' }]]),
      nested: [],
    };

    await writeSidecarPackageJson(
      outputPath,
      new Set(['pkg-a', 'pkg-missing']),
      logger,
      resolution,
    );

    const sidecar = await fs.readJson(path.join(outputDir, 'package.json'));
    expect(sidecar.dependencies).toEqual({ 'pkg-a': '1.0.0' });
    expect(sidecar.dependencies).not.toHaveProperty('pkg-missing');
  });

  it('does not write sidecar when zero externals resolve', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    await writeSidecarPackageJson(
      outputPath,
      new Set(['nothing-installed']),
      logger,
      { topLevel: new Map(), nested: [] },
    );

    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
  });

  it('emits dependencies sorted alphabetically for deterministic output', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    const resolution: ResolutionResult = {
      topLevel: new Map([
        ['zeta', { name: 'zeta', version: '1.0.0' }],
        ['alpha', { name: 'alpha', version: '1.0.0' }],
        ['mu', { name: 'mu', version: '1.0.0' }],
      ]),
      nested: [],
    };

    await writeSidecarPackageJson(
      outputPath,
      new Set(['zeta', 'alpha', 'mu']),
      logger,
      resolution,
    );

    const sidecarRaw = await fs.readFile(
      path.join(outputDir, 'package.json'),
      'utf-8',
    );
    const sidecar = JSON.parse(sidecarRaw);
    expect(Object.keys(sidecar.dependencies)).toEqual(['alpha', 'mu', 'zeta']);
  });
});

describe('npm config discovery', () => {
  it('resolves PACOTE_OPTS.registry from project .npmrc when present', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'npmrc-'));
    await fs.writeFile(
      path.join(tmp, '.npmrc'),
      'registry=https://npm.example.com\n',
    );
    const opts = await loadNpmConfigForPacote(tmp, tmp);
    expect(opts.registry).toBe('https://npm.example.com/');
  });

  it('falls back to default registry when no .npmrc', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'npmrc-empty-'));
    const opts = await loadNpmConfigForPacote(tmp, tmp);
    expect(opts.registry).toBe('https://registry.npmjs.org/');
  });

  it('honors scope-specific registry override', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'npmrc-scope-'));
    await fs.writeFile(
      path.join(tmp, '.npmrc'),
      '@walkeros:registry=https://npm.elbwalker.com\n',
    );
    const opts = await loadNpmConfigForPacote(tmp, tmp);
    expect((opts as Record<string, unknown>)['@walkeros:registry']).toBe(
      'https://npm.elbwalker.com/',
    );
  });

  it('strips surrounding quotes from auth token values', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'npmrc-auth-'));
    await fs.writeFile(
      path.join(tmp, '.npmrc'),
      '//registry.example.com/:_authToken="abc123"\n',
    );
    const opts = await loadNpmConfigForPacote(tmp, tmp);
    expect(
      (opts as Record<string, unknown>)['//registry.example.com/:_authToken'],
    ).toBe('abc123');
  });
});

describe('L2 code cache key', () => {
  let tmp: string;

  const baseInputs: CodeCacheKeyInputs = {
    externals: new Set<string>(),
    platform: 'node',
    target: 'node20',
    nodeMajor: 20,
    format: 'esm',
    minify: false,
    minifyOptions: undefined,
    windowCollector: undefined,
    windowElb: undefined,
    versionsHash: 'v1',
  };

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'l2cachekey-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('differs when externals differ', async () => {
    const a = await getCodeCachePath('same-code', tmp, baseInputs);
    const b = await getCodeCachePath('same-code', tmp, {
      ...baseInputs,
      externals: new Set(['foo']),
    });
    expect(a).not.toEqual(b);
  });

  it('differs when platform differs', async () => {
    const a = await getCodeCachePath('same-code', tmp, baseInputs);
    const b = await getCodeCachePath('same-code', tmp, {
      ...baseInputs,
      platform: 'browser',
    });
    expect(a).not.toEqual(b);
  });

  it.each<
    [keyof CodeCacheKeyInputs, CodeCacheKeyInputs[keyof CodeCacheKeyInputs]]
  >([
    ['format', 'iife'],
    ['minify', true],
    ['target', 'es2022'],
    ['windowCollector', 'walker'],
    ['windowElb', 'walker'],
    ['versionsHash', 'v2'],
  ])('differs when %s differs', async (field, value) => {
    const a = await getCodeCachePath('same-code', tmp, baseInputs);
    const b = await getCodeCachePath('same-code', tmp, {
      ...baseInputs,
      [field]: value,
    });
    expect(a).not.toEqual(b);
  });

  it('matches when all key inputs match', async () => {
    const a = await getCodeCachePath('same-code', tmp, baseInputs);
    const b = await getCodeCachePath('same-code', tmp, { ...baseInputs });
    expect(a).toEqual(b);
  });
});

describe('assertNoPostinstallScripts', () => {
  type ManifestEntry = { scripts?: Record<string, string> };

  it('throws naming the offending package when manifest has postinstall', () => {
    const manifests = new Map<string, ManifestEntry>([
      ['foo', { scripts: { postinstall: 'node ./build.js' } }],
      ['bar', { scripts: {} }],
    ]);
    expect(() => assertNoPostinstallScripts(manifests)).toThrow(
      /Package foo|foo \(postinstall\)/,
    );
  });

  it('throws listing all offenders when multiple packages have scripts', () => {
    const manifests = new Map<string, ManifestEntry>([
      ['foo', { scripts: { install: 'node-gyp' } }],
      ['bar', { scripts: { preinstall: 'echo' } }],
      ['baz', {}],
    ]);
    expect(() => assertNoPostinstallScripts(manifests)).toThrow(
      /foo[\s\S]*bar/,
    );
  });

  it('passes when no package declares lifecycle scripts', () => {
    const manifests = new Map<string, ManifestEntry>([
      ['foo', { scripts: { test: 'jest' } }],
      ['bar', {}],
    ]);
    expect(() => assertNoPostinstallScripts(manifests)).not.toThrow();
  });
});

describe('downloadPackagesWithResolution signature', () => {
  it('exists as an exported function', () => {
    expect(typeof downloadPackagesWithResolution).toBe('function');
  });

  it('original downloadPackages still returns Map<string, string>', async () => {
    // Empty packages list = no-op, no network call.
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dp-noop-'));
    const logger = createCLILogger({ silent: true });
    const { downloadPackages } =
      await import('../../../commands/bundle/package-manager.js');
    const result = await downloadPackages([], tmp, logger);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });
});

describe('installExternalsViaPacote', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'install-externals-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('returns empty install plan and creates no node_modules when externals is empty', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);

    const result = await installExternalsViaPacote({
      externals: new Set(),
      packagePaths: new Map(),
      outputDir,
      logger,
    });

    expect(result.installed).toEqual([]);
    expect(await fs.pathExists(path.join(outputDir, 'node_modules'))).toBe(
      false,
    );
    // No pacote calls when nothing to install.
    expect(mockManifest).not.toHaveBeenCalled();
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('reuses pre-extracted package via fs.copy when tempNodeModules entry exists', async () => {
    const outputDir = path.join(tmp, 'out');
    const tempNodeModules = path.join(tmp, 'temp-node-modules');
    await fs.ensureDir(outputDir);

    // Seed the pre-extracted package on disk so the install path takes the
    // fs.copy branch and never reaches pacote.extract.
    const fakePkgDir = path.join(tempNodeModules, 'fake-canary');
    await fs.outputJson(path.join(fakePkgDir, 'package.json'), {
      name: 'fake-canary',
      version: '1.2.3',
    });
    await fs.outputFile(
      path.join(fakePkgDir, 'index.js'),
      'module.exports={};',
    );

    // Closure manifest fetch returns no deps and no scripts.
    mockManifest.mockResolvedValue({
      name: 'fake-canary',
      version: '1.2.3',
      dependencies: {},
    } as never);

    const result = await installExternalsViaPacote({
      externals: new Set(['fake-canary']),
      packagePaths: new Map(),
      outputDir,
      logger,
      tempNodeModules,
    });

    expect(result.installed).toContainEqual(
      expect.objectContaining({ name: 'fake-canary' }),
    );
    const copied = path.join(outputDir, 'node_modules', 'fake-canary');
    expect(await fs.pathExists(path.join(copied, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(copied, 'index.js'))).toBe(true);
    // pacote.extract must NOT be called when the pre-extracted source is reused.
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('hard-errors before any extraction when a closure manifest declares postinstall', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);

    mockManifest.mockResolvedValue({
      name: 'evil-pkg',
      version: '1.0.0',
      dependencies: {},
      scripts: { postinstall: 'node ./build.js' },
    } as never);

    await expect(
      installExternalsViaPacote({
        externals: new Set(['evil-pkg']),
        packagePaths: new Map(),
        outputDir,
        logger,
      }),
    ).rejects.toThrow(/evil-pkg.*postinstall|postinstall.*evil-pkg/);
    // assertNoPostinstallScripts runs before extraction, so extract must not be invoked.
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('rolls back the entire output node_modules when an extract fails mid-run', async () => {
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);

    // Two-package closure: good-pkg + bad-pkg, neither with postinstall scripts.
    mockManifest.mockImplementation(async (spec: string) => {
      const [name] = String(spec).split('@');
      return {
        name,
        version: '1.0.0',
        dependencies: {},
      } as never;
    });

    // Good extracts cleanly; bad rejects.
    mockExtract.mockImplementation(async (spec, dest) => {
      const [name] = String(spec).split('@');
      if (name === 'bad-pkg') {
        throw new Error('simulated network failure');
      }
      // Simulate a successful extraction by writing a marker file.
      if (typeof dest === 'string') {
        await fs.outputFile(path.join(dest, 'package.json'), '{}');
      }
      return { from: spec, resolved: spec, integrity: 'sha512-x' } as never;
    });

    await expect(
      installExternalsViaPacote({
        externals: new Set(['good-pkg', 'bad-pkg']),
        packagePaths: new Map(),
        outputDir,
        logger,
      }),
    ).rejects.toThrow();

    // Bundle-level rollback: the entire node_modules tree must be gone.
    expect(await fs.pathExists(path.join(outputDir, 'node_modules'))).toBe(
      false,
    );
  });

  it('walks peerDependencies into the install closure', async () => {
    // The v3-vs-v2 differentiator: declared external `parent-pkg` declares
    // a peerDependency on `peer-pkg`. The install closure must include both,
    // proving collectAllSpecs (not a hand-rolled BFS) drives discovery.
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);

    mockManifest.mockImplementation(async (spec: string) => {
      const [name] = String(spec).split('@');
      if (name === 'parent-pkg') {
        return {
          name: 'parent-pkg',
          version: '1.0.0',
          dependencies: {},
          peerDependencies: { 'peer-pkg': '2.0.0' },
        } as never;
      }
      if (name === 'peer-pkg') {
        return {
          name: 'peer-pkg',
          version: '2.0.0',
          dependencies: {},
        } as never;
      }
      throw new Error(`Unexpected manifest fetch for ${spec}`);
    });

    mockExtract.mockImplementation(async (spec, dest) => {
      if (typeof dest === 'string') {
        await fs.outputFile(path.join(dest, 'package.json'), '{}');
      }
      return { from: spec, resolved: spec, integrity: 'sha512-x' } as never;
    });

    const result = await installExternalsViaPacote({
      externals: new Set(['parent-pkg']),
      packagePaths: new Map(),
      outputDir,
      logger,
    });

    const installedNames = result.installed.map((p) => p.name).sort();
    expect(installedNames).toEqual(['parent-pkg', 'peer-pkg']);
    expect(
      await fs.pathExists(path.join(outputDir, 'node_modules', 'parent-pkg')),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(outputDir, 'node_modules', 'peer-pkg')),
    ).toBe(true);
  });
});

/**
 * End-to-end install pipeline: bundleCore must invoke the install + lockfile
 * machinery in BOTH cache-hit and fresh-build paths, and stale install
 * artifacts in the output directory must be purged unconditionally before
 * any build work begins. We exercise the cache-hit branch here so the test
 * doesn't have to drive a real esbuild compile — pre-populate the L1 build
 * cache and bundleCore takes the fast path. The mocks for
 * `downloadPackagesWithResolution` and `installExternalsViaPacote` keep us
 * off the registry while still letting us assert on what files the wire-up
 * produces.
 */
describe('end-to-end install', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-install-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  /**
   * Build a bundleCore-compatible (flowSettings, buildOptions) pair where
   * the flow has no sources/destinations (so createEntryPoint emits a
   * trivial code skeleton) and the build cache has been pre-seeded with
   * a known bundle output. Returns the cached bundle text so the caller
   * can assert what got written to outputPath.
   */
  async function setupCachedBuild(opts: {
    outputPath: string;
    cacheDir: string;
    packageExternals: Set<string>;
    cacheBundleText?: string;
  }): Promise<{
    flowSettings: Flow;
    buildOptions: BuildOptions;
    cachedBundleText: string;
  }> {
    const flowSettings: Flow = {
      config: { platform: 'web' },
    };
    const buildOptions: BuildOptions = {
      output: opts.outputPath,
      tempDir: opts.cacheDir,
      cache: true,
      packages: {},
      format: 'esm',
      platform: 'browser',
      configDir: tmp,
    };

    const cachedBundleText =
      opts.cacheBundleText ?? '// cached bundle output\n';

    // Mirror generateCacheKeyContent (private to bundler.ts) exactly so the
    // pre-seeded cache key matches what bundleCore computes at runtime.
    const configForCache = {
      flow: flowSettings,
      build: { ...buildOptions, tempDir: undefined, output: undefined },
      externals: [...opts.packageExternals].sort(),
    };
    const configContent = JSON.stringify(configForCache);
    await cacheBuild(configContent, cachedBundleText, opts.cacheDir);

    return { flowSettings, buildOptions, cachedBundleText };
  }

  it('writes lockfile + install artifacts when externals are declared', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'bundle.mjs');

    // Seed a fake "downloaded" package directory whose package.json declares
    // a runtime external. readBundleExternals walks this map and produces
    // the externals set the install pipeline runs against.
    const fakePkgDir = path.join(tmp, 'fake-pkgs', 'pkg-with-canary');
    await fs.outputJson(path.join(fakePkgDir, 'package.json'), {
      name: 'pkg-with-canary',
      version: '1.0.0',
      walkerOS: { bundle: { external: ['fake-canary'] } },
      dependencies: { 'fake-canary': '^1.0.0' },
    });

    // Pre-populate the temp install dir's node_modules so the sidecar
    // package.json can resolve the canary's version (writeSidecarPackageJson
    // reads from <tempDir>/node_modules/<name>/package.json).
    await fs.outputJson(
      path.join(
        tmp,
        'temp-build',
        'node_modules',
        'fake-canary',
        'package.json',
      ),
      { name: 'fake-canary', version: '1.2.3' },
    );

    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map([['pkg-with-canary', fakePkgDir]]),
      resolution: {
        topLevel: new Map([
          ['pkg-with-canary', { name: 'pkg-with-canary', version: '1.0.0' }],
          ['fake-canary', { name: 'fake-canary', version: '1.2.3' }],
        ]),
        nested: [],
      },
    });

    // The mocked install writes the canary's package.json into
    // outputDir/node_modules and reports back the install plan that
    // writeBundleLockfile will turn into a package-lock.json.
    mockInstallExternals.mockImplementation(async (args) => {
      await fs.outputJson(
        path.join(
          args.outputDir,
          'node_modules',
          'fake-canary',
          'package.json',
        ),
        { name: 'fake-canary', version: '1.2.3' },
      );
      return { installed: [{ name: 'fake-canary', version: '1.2.3' }] };
    });

    const { flowSettings, buildOptions } = await setupCachedBuild({
      outputPath,
      cacheDir,
      packageExternals: new Set(['fake-canary']),
    });
    // Override tempDir resolution so writeSidecarPackageJson finds the
    // canary version in the seeded temp-build/node_modules.
    buildOptions.tempDir = path.join(tmp, 'temp-build');
    // Re-seed cache against the new tempDir so the cache key still matches.
    const configForCache = {
      flow: flowSettings,
      build: { ...buildOptions, tempDir: undefined, output: undefined },
      externals: ['fake-canary'],
    };
    await cacheBuild(JSON.stringify(configForCache), '// cached\n', cacheDir);
    // The L1 cache lives under CACHE_DIR which equals buildOptions.tempDir
    // when set, so re-seed there too.
    await cacheBuild(
      JSON.stringify(configForCache),
      '// cached\n',
      buildOptions.tempDir,
    );

    await bundleCore(flowSettings, buildOptions, logger);

    expect(await fs.pathExists(outputPath)).toBe(true);
    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      true,
    );
    expect(await fs.pathExists(path.join(outputDir, 'package-lock.json'))).toBe(
      true,
    );
    expect(
      await fs.pathExists(
        path.join(outputDir, 'node_modules', 'fake-canary', 'package.json'),
      ),
    ).toBe(true);

    const lockfile = await fs.readJson(
      path.join(outputDir, 'package-lock.json'),
    );
    expect(lockfile.lockfileVersion).toBe(3);
    expect(lockfile.packages['']?.dependencies).toMatchObject({
      'fake-canary': '1.2.3',
    });
    expect(lockfile.packages['node_modules/fake-canary']).toMatchObject({
      version: '1.2.3',
    });

    expect(mockInstallExternals).toHaveBeenCalledTimes(1);
  });

  it('writes only bundle.mjs when no externals are declared', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'bundle.mjs');

    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map(),
      resolution: { topLevel: new Map(), nested: [] },
    });
    mockInstallExternals.mockResolvedValue({ installed: [] });

    const { flowSettings, buildOptions } = await setupCachedBuild({
      outputPath,
      cacheDir,
      packageExternals: new Set(),
    });

    await bundleCore(flowSettings, buildOptions, logger);

    expect(await fs.pathExists(outputPath)).toBe(true);
    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(outputDir, 'package-lock.json'))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(outputDir, 'node_modules'))).toBe(
      false,
    );
  });

  it('removes stale install artifacts before bundling', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'bundle.mjs');

    // Pre-create stale artifacts from a previous build that the user has
    // since reconfigured to have no externals.
    await fs.outputFile(
      path.join(outputDir, 'node_modules', 'leftover', 'index.js'),
      '// stale\n',
    );
    await fs.outputJson(path.join(outputDir, 'package.json'), {
      name: 'walkeros-bundle',
      dependencies: { 'leftover-dep': '1.0.0' },
    });
    await fs.outputJson(path.join(outputDir, 'package-lock.json'), {
      name: 'walkeros-bundle',
      lockfileVersion: 3,
    });

    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map(),
      resolution: { topLevel: new Map(), nested: [] },
    });
    mockInstallExternals.mockResolvedValue({ installed: [] });

    const { flowSettings, buildOptions } = await setupCachedBuild({
      outputPath,
      cacheDir,
      packageExternals: new Set(),
    });

    await bundleCore(flowSettings, buildOptions, logger);

    // The bundle itself was written.
    expect(await fs.pathExists(outputPath)).toBe(true);
    // All three stale paths must have been removed before the build.
    expect(
      await fs.pathExists(path.join(outputDir, 'node_modules', 'leftover')),
    ).toBe(false);
    expect(await fs.pathExists(path.join(outputDir, 'node_modules'))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
    expect(await fs.pathExists(path.join(outputDir, 'package-lock.json'))).toBe(
      false,
    );
  });
});

describe('post-build __dirname warning', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dn-warn-'));
  });
  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('warns when bundle still contains __dirname references', async () => {
    const bundlePath = path.join(tmp, 'bundle.mjs');
    await fs.writeFile(bundlePath, 'const x = __dirname;\n');
    const tempNm = path.join(tmp, 'node_modules');
    await fs.ensureDir(tempNm);
    const warn = jest.fn();
    const logger = {
      error: jest.fn(),
      warn,
      info: jest.fn(),
      debug: jest.fn(),
    };
    await warnOnSuspectGlobals(bundlePath, tempNm, logger as never);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Bundle contains'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('walkerOS.bundle.external'),
    );
  });

  it('lists candidate packages by hit count when bundle and tempDir both contain __dirname', async () => {
    const bundlePath = path.join(tmp, 'bundle.mjs');
    await fs.writeFile(
      bundlePath,
      'const a = __dirname; const b = __dirname;\n',
    );
    const tempNm = path.join(tmp, 'node_modules');
    // pkg-a: 2 hits across 2 files
    await fs.outputFile(
      path.join(tempNm, 'pkg-a', 'a.js'),
      'const x = __dirname;\n',
    );
    await fs.outputFile(
      path.join(tempNm, 'pkg-a', 'b.js'),
      'const y = __dirname;\n',
    );
    // pkg-b: 1 hit
    await fs.outputFile(
      path.join(tempNm, 'pkg-b', 'index.js'),
      'const z = __dirname;\n',
    );
    const warn = jest.fn();
    const logger = {
      error: jest.fn(),
      warn,
      info: jest.fn(),
      debug: jest.fn(),
    };
    await warnOnSuspectGlobals(bundlePath, tempNm, logger as never);
    const msg = warn.mock.calls[0][0] as string;
    expect(msg).toMatch(/pkg-a.*\(2 refs?\)/);
    expect(msg).toMatch(/pkg-b.*\(1 ref\)/);
    // pkg-a should appear before pkg-b (sorted descending by hits)
    expect(msg.indexOf('pkg-a')).toBeLessThan(msg.indexOf('pkg-b'));
  });

  it('does NOT warn when bundle is clean', async () => {
    const bundlePath = path.join(tmp, 'bundle.mjs');
    await fs.writeFile(bundlePath, 'const ok = "no globals";\n');
    const tempNm = path.join(tmp, 'node_modules');
    await fs.ensureDir(tempNm);
    const warn = jest.fn();
    const logger = {
      error: jest.fn(),
      warn,
      info: jest.fn(),
      debug: jest.fn(),
    };
    await warnOnSuspectGlobals(bundlePath, tempNm, logger as never);
    expect(warn).not.toHaveBeenCalled();
  });

  it('honors // walkeros: dirname-ok suppression marker', async () => {
    const bundlePath = path.join(tmp, 'bundle.mjs');
    await fs.writeFile(
      bundlePath,
      'const x = __dirname; // walkeros: dirname-ok\n',
    );
    const tempNm = path.join(tmp, 'node_modules');
    await fs.ensureDir(tempNm);
    const warn = jest.fn();
    const logger = {
      error: jest.fn(),
      warn,
      info: jest.fn(),
      debug: jest.fn(),
    };
    await warnOnSuspectGlobals(bundlePath, tempNm, logger as never);
    expect(warn).not.toHaveBeenCalled();
  });
});
