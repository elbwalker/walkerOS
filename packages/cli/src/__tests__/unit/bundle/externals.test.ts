import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {
  readBundleExternals,
  writeSidecarPackageJson,
} from '../../../commands/bundle/bundler.js';
import { createCLILogger } from '../../../core/cli-logger.js';

/**
 * Tests for the per-package externals mechanism. Step packages declare runtime
 * deps that cannot be ESM-bundled (e.g. `@google-cloud/bigquery-storage` and
 * its `__dirname`-using gRPC stack) via `walkerosBundle.external` in their
 * package.json. The bundler reads these, externalizes them, and writes a
 * sidecar package.json next to the bundle so deploy-time `npm ci --omit=dev`
 * provides them at runtime.
 */
describe('walkerosBundle.external — readBundleExternals helper', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rbe-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('returns empty set when no installed package declares walkerosBundle.external', async () => {
    const pkgDir = path.join(tmp, 'node_modules', 'foo');
    await fs.outputJson(path.join(pkgDir, 'package.json'), {
      name: 'foo',
      version: '1.0.0',
    });
    const result = await readBundleExternals(new Map([['foo', pkgDir]]));
    expect(result).toEqual(new Set());
  });

  it('reads and unions externals across multiple packages', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    const b = path.join(tmp, 'node_modules', 'b');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerosBundle: { external: ['x', 'y'] },
    });
    await fs.outputJson(path.join(b, 'package.json'), {
      name: 'b',
      version: '1.0.0',
      walkerosBundle: { external: ['y', 'z'] },
    });
    const result = await readBundleExternals(
      new Map([
        ['a', a],
        ['b', b],
      ]),
    );
    expect(result).toEqual(new Set(['x', 'y', 'z']));
  });

  it('ignores malformed walkerosBundle (non-array external)', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerosBundle: { external: 'not-an-array' },
    });
    const result = await readBundleExternals(new Map([['a', a]]));
    expect(result).toEqual(new Set());
  });

  it('skips packages whose package.json is missing or unreadable', async () => {
    const missing = path.join(tmp, 'does-not-exist');
    const result = await readBundleExternals(new Map([['ghost', missing]]));
    expect(result).toEqual(new Set());
  });

  it('skips empty strings and non-string entries in the array', async () => {
    const a = path.join(tmp, 'node_modules', 'a');
    await fs.outputJson(path.join(a, 'package.json'), {
      name: 'a',
      version: '1.0.0',
      walkerosBundle: { external: ['valid', '', 42, null, 'also-valid'] },
    });
    const result = await readBundleExternals(new Map([['a', a]]));
    expect(result).toEqual(new Set(['valid', 'also-valid']));
  });
});

describe('walkerosBundle.external — writeSidecarPackageJson', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sidecar-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('writes sidecar package.json with resolved versions when externals exist', async () => {
    // Pre-populate temp node_modules with two fake installed packages.
    const tempDir = path.join(tmp, 'build');
    await fs.outputJson(
      path.join(tempDir, 'node_modules', 'pkg-a', 'package.json'),
      { name: 'pkg-a', version: '2.3.4' },
    );
    await fs.outputJson(
      path.join(tempDir, 'node_modules', 'pkg-b', 'package.json'),
      { name: 'pkg-b', version: '0.5.1-rc.0' },
    );

    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    await writeSidecarPackageJson(
      outputPath,
      new Set(['pkg-a', 'pkg-b']),
      tempDir,
      logger,
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

    await writeSidecarPackageJson(outputPath, new Set(), tmp, logger);

    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
  });

  it('omits externals not present in node_modules but still writes sidecar if any resolve', async () => {
    const tempDir = path.join(tmp, 'build');
    await fs.outputJson(
      path.join(tempDir, 'node_modules', 'pkg-a', 'package.json'),
      { name: 'pkg-a', version: '1.0.0' },
    );

    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    await writeSidecarPackageJson(
      outputPath,
      new Set(['pkg-a', 'pkg-missing']),
      tempDir,
      logger,
    );

    const sidecar = await fs.readJson(path.join(outputDir, 'package.json'));
    expect(sidecar.dependencies).toEqual({ 'pkg-a': '1.0.0' });
    expect(sidecar.dependencies).not.toHaveProperty('pkg-missing');
  });

  it('does not write sidecar when zero externals resolve', async () => {
    const tempDir = path.join(tmp, 'build');
    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    await writeSidecarPackageJson(
      outputPath,
      new Set(['nothing-installed']),
      tempDir,
      logger,
    );

    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
  });

  it('emits dependencies sorted alphabetically for deterministic output', async () => {
    const tempDir = path.join(tmp, 'build');
    for (const name of ['zeta', 'alpha', 'mu']) {
      await fs.outputJson(
        path.join(tempDir, 'node_modules', name, 'package.json'),
        { name, version: '1.0.0' },
      );
    }

    const outputDir = path.join(tmp, 'out');
    await fs.ensureDir(outputDir);
    const outputPath = path.join(outputDir, 'bundle.mjs');

    await writeSidecarPackageJson(
      outputPath,
      new Set(['zeta', 'alpha', 'mu']),
      tempDir,
      logger,
    );

    const sidecarRaw = await fs.readFile(
      path.join(outputDir, 'package.json'),
      'utf-8',
    );
    const sidecar = JSON.parse(sidecarRaw);
    expect(Object.keys(sidecar.dependencies)).toEqual(['alpha', 'mu', 'zeta']);
  });
});
