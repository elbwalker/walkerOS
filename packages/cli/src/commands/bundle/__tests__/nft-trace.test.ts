import { traceAndCopy, assertDepsTraced } from '../nft-trace';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';

async function mkTmp(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return fs.realpath(dir);
}

describe('traceAndCopy', () => {
  it('traces a simple ESM entry and reports a fileList', async () => {
    const tmp = await mkTmp('nft-trace-test-');
    const entry = path.join(tmp, 'flow.mjs');
    await fs.writeFile(
      entry,
      "import { existsSync } from 'node:fs';\nexport default () => existsSync;\n",
    );
    const out = path.join(tmp, 'out');
    const result = await traceAndCopy({ entry, base: tmp, outDir: out });
    expect(result.fileList.length).toBeGreaterThan(0);
    expect(result.copied).toBeGreaterThanOrEqual(0);
  });

  it('copies traced files to outDir preserving paths relative to base', async () => {
    const tmp = await mkTmp('nft-trace-copy-');
    // Create lockfile so base-detect stops here.
    await fs.writeFile(path.join(tmp, 'package-lock.json'), '{}');

    // Create a fake node_modules package the entry imports.
    const pkgDir = path.join(tmp, 'node_modules', 'pretend-pkg');
    await fs.mkdir(pkgDir, { recursive: true });
    await fs.writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: 'pretend-pkg',
        version: '1.0.0',
        main: 'index.js',
      }),
    );
    await fs.writeFile(
      path.join(pkgDir, 'index.js'),
      'module.exports = function hello() { return 42; };\n',
    );

    const entry = path.join(tmp, 'flow.mjs');
    await fs.writeFile(
      entry,
      "import pretend from 'pretend-pkg';\nexport default pretend;\n",
    );

    const out = path.join(tmp, 'out');
    const result = await traceAndCopy({ entry, base: tmp, outDir: out });

    expect(result.copied).toBeGreaterThan(0);
    const copiedIndex = path.join(
      out,
      'node_modules',
      'pretend-pkg',
      'index.js',
    );
    const copiedPkgJson = path.join(
      out,
      'node_modules',
      'pretend-pkg',
      'package.json',
    );
    const indexExists = await fs
      .stat(copiedIndex)
      .then(() => true)
      .catch(() => false);
    const pkgExists = await fs
      .stat(copiedPkgJson)
      .then(() => true)
      .catch(() => false);
    expect(indexExists || pkgExists).toBe(true);
  });

  it('preserves executable bit on .node native bindings', async () => {
    const tmp = await mkTmp('nft-trace-execbit-');
    await fs.writeFile(path.join(tmp, 'package-lock.json'), '{}');

    // Write a fake .node file with executable bits set on the source.
    const nodeFile = path.join(tmp, 'lib', 'binding.node');
    await fs.mkdir(path.dirname(nodeFile), { recursive: true });
    await fs.writeFile(nodeFile, Buffer.from('fake native binding'));
    await fs.chmod(nodeFile, 0o755);

    // Trivial entry. We force the .node into the trace via extraIncludes so
    // nft definitely reports it.
    const entry = path.join(tmp, 'flow.mjs');
    await fs.writeFile(entry, 'export default () => null;\n');

    const outDir = path.join(tmp, 'out');
    const result = await traceAndCopy({
      entry,
      base: tmp,
      outDir,
      extraIncludes: [nodeFile],
    });

    const dst = path.join(outDir, 'lib', 'binding.node');
    const dstStat = await fs.stat(dst);
    // Exec bit preserved.
    expect(dstStat.mode & 0o111).toBeTruthy();
    // Full source mode preserved on the destination.
    expect(dstStat.mode & 0o777).toBe(0o755);
    expect(result.copied).toBeGreaterThan(0);

    // Note: on Linux, fs.copyFile preserves source mode, so this test would
    // pass on Linux even without the explicit chmod in traceAndCopy. The
    // chmod is a portability guarantee for platforms where copyFile drops
    // mode bits (Windows, certain network filesystems). The assertion above
    // is the contract: destination must carry the source's exec bits. Do
    // not weaken to a fallback "if file exists" check.
  });

  it('throws an actionable error when the entry file does not exist', async () => {
    const tmp = await mkTmp('nft-trace-missing-entry-');
    await fs.writeFile(path.join(tmp, 'package-lock.json'), '{}');

    const missing = path.join(tmp, 'does-not-exist.mjs');
    const out = path.join(tmp, 'out');

    await expect(
      traceAndCopy({ entry: missing, base: tmp, outDir: out }),
    ).rejects.toThrow(/entry file not found/);
  });

  it('rejects files that resolve outside outDir (path-escape guard)', async () => {
    const tmp = await mkTmp('nft-trace-escape-');
    await fs.writeFile(path.join(tmp, 'package-lock.json'), '{}');

    // Entry that does not import anything risky. We will trigger the escape
    // path by passing an extraInclude with an absolute escape path.
    const entry = path.join(tmp, 'flow.mjs');
    await fs.writeFile(entry, 'export default 1;\n');

    // Create a sibling escape file outside the base dir.
    const escapeDir = await mkTmp('nft-trace-escape-target-');
    const escapeFile = path.join(escapeDir, 'escape.js');
    await fs.writeFile(escapeFile, 'module.exports = 1;\n');

    const out = path.join(tmp, 'out');

    // Build a relative path from base that escapes via "..".
    const escapeRelative = path.relative(tmp, escapeFile);
    expect(escapeRelative.startsWith('..')).toBe(true);

    await expect(
      traceAndCopy({
        entry,
        base: tmp,
        outDir: out,
        extraIncludes: [escapeFile],
      }),
    ).rejects.toThrow(/outside outDir|workspace root|traceInclude/);
  });

  it('assertDepsTraced is a no-op when every expected package is in the trace', () => {
    expect(() =>
      assertDepsTraced({
        fileList: [
          'node_modules/foo/package.json',
          'node_modules/foo/index.js',
          'node_modules/@scope/bar/package.json',
        ],
        expectedPackages: ['foo', '@scope/bar'],
      }),
    ).not.toThrow();
  });

  it('assertDepsTraced throws an actionable error listing missing packages', () => {
    expect(() =>
      assertDepsTraced({
        fileList: ['node_modules/foo/package.json'],
        expectedPackages: ['foo', 'missing-pkg', '@scope/also-missing'],
      }),
    ).toThrow(/missing-pkg, @scope\/also-missing/);
  });

  it('assertDepsTraced error mentions traceInclude as the workaround', () => {
    expect(() =>
      assertDepsTraced({
        fileList: [],
        expectedPackages: ['some-pkg'],
      }),
    ).toThrow(/traceInclude/);
  });

  it('extraIncludes literal path is added as a trace entry resolved against base', async () => {
    const tmp = await mkTmp('nft-trace-extra-literal-');
    await fs.writeFile(path.join(tmp, 'package-lock.json'), '{}');

    const entry = path.join(tmp, 'flow.mjs');
    await fs.writeFile(entry, 'export default 1;\n');

    // Create a literal extra-include file inside base.
    const extraRel = 'shared/runtime-config.json';
    const extraAbs = path.join(tmp, extraRel);
    await fs.mkdir(path.dirname(extraAbs), { recursive: true });
    await fs.writeFile(extraAbs, '{"hello":"world"}\n');

    const outDir = path.join(tmp, 'out');
    await traceAndCopy({
      entry,
      base: tmp,
      outDir,
      // Pass as a relative path; expansion resolves it against base.
      extraIncludes: [extraRel],
    });

    const copied = path.join(outDir, extraRel);
    const exists = await fs
      .stat(copied)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it('extraIncludes glob expands to matching files relative to base', async () => {
    const tmp = await mkTmp('nft-trace-extra-glob-');
    await fs.writeFile(path.join(tmp, 'package-lock.json'), '{}');

    const entry = path.join(tmp, 'flow.mjs');
    await fs.writeFile(entry, 'export default 1;\n');

    // Build a small fake package tree with files the glob should match
    // and one file it should NOT match.
    const pkgRuntime = path.join(tmp, 'node_modules', 'my-pkg', 'runtime');
    await fs.mkdir(pkgRuntime, { recursive: true });
    await fs.writeFile(path.join(pkgRuntime, 'config.json'), '{}\n');
    await fs.writeFile(path.join(pkgRuntime, 'schema.json'), '{}\n');
    await fs.writeFile(path.join(pkgRuntime, 'README.md'), '# nope\n');

    const outDir = path.join(tmp, 'out');
    await traceAndCopy({
      entry,
      base: tmp,
      outDir,
      extraIncludes: ['node_modules/my-pkg/runtime/*.json'],
    });

    const matchedConfig = await fs
      .stat(
        path.join(outDir, 'node_modules', 'my-pkg', 'runtime', 'config.json'),
      )
      .then(() => true)
      .catch(() => false);
    const matchedSchema = await fs
      .stat(
        path.join(outDir, 'node_modules', 'my-pkg', 'runtime', 'schema.json'),
      )
      .then(() => true)
      .catch(() => false);
    const skippedReadme = await fs
      .stat(path.join(outDir, 'node_modules', 'my-pkg', 'runtime', 'README.md'))
      .then(() => true)
      .catch(() => false);

    expect(matchedConfig).toBe(true);
    expect(matchedSchema).toBe(true);
    expect(skippedReadme).toBe(false);
  });

  it('preserves __dirname-loaded asset directories like build/protos/ (GCP regression)', async () => {
    // Regression check for the @google-cloud/bigquery-storage failure mode:
    // the package loads .proto files at runtime via __dirname, so the
    // bundler must NOT externalize-and-drop them. Instead nft must trace
    // and copy build/protos/ next to the JS that references it. This test
    // simulates that shape without installing the real GCP SDK.
    const tmp = await mkTmp('nft-trace-gcp-protos-');
    await fs.writeFile(path.join(tmp, 'package-lock.json'), '{}');

    // Fake @google-cloud/bigquery-storage with a .proto under build/protos/.
    const pkgDir = path.join(
      tmp,
      'node_modules',
      '@google-cloud',
      'bigquery-storage',
    );
    const protosDir = path.join(pkgDir, 'build', 'protos');
    await fs.mkdir(protosDir, { recursive: true });
    await fs.writeFile(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@google-cloud/bigquery-storage',
        version: '5.1.0',
        main: 'build/src/index.js',
      }),
    );
    // Mirror real GCP: the JS resolves a .proto via __dirname.
    const srcDir = path.join(pkgDir, 'build', 'src');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.writeFile(
      path.join(srcDir, 'index.js'),
      "const path = require('path');\n" +
        "module.exports.protoPath = path.join(__dirname, '..', 'protos', 'storage.proto');\n",
    );
    await fs.writeFile(
      path.join(protosDir, 'storage.proto'),
      'syntax = "proto3";\nmessage StreamRows {}\n',
    );

    const entry = path.join(tmp, 'flow.mjs');
    await fs.writeFile(
      entry,
      "import bq from '@google-cloud/bigquery-storage';\nexport default bq;\n",
    );

    const outDir = path.join(tmp, 'out');
    const result = await traceAndCopy({ entry, base: tmp, outDir });

    // The .proto must land under outDir/node_modules/@google-cloud/bigquery-storage/build/protos/.
    const tracedProto = path.join(
      outDir,
      'node_modules',
      '@google-cloud',
      'bigquery-storage',
      'build',
      'protos',
      'storage.proto',
    );
    const protoExists = await fs
      .stat(tracedProto)
      .then(() => true)
      .catch(() => false);
    expect(protoExists).toBe(true);
    expect(result.copied).toBeGreaterThan(0);
  });
});
