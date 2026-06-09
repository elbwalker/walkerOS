import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { x as tarExtract } from 'tar';
import { packBundleDir } from '../archive.js';

/**
 * Stage a directory shaped like a node-platform bundle output:
 * flow.mjs + node_modules/<pkg>/index.js + package.json.
 */
function stageBundleDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'walkeros-archive-src-'));
  writeFileSync(join(dir, 'flow.mjs'), 'export default function flow() {}\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'walkeros-bundle', type: 'module' }),
  );
  const pkgDir = join(dir, 'node_modules', 'demo-pkg');
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, 'index.js'), 'module.exports = {};\n');
  return dir;
}

describe('packBundleDir', () => {
  it('packs flow.mjs, node_modules and package.json with relative paths', async () => {
    const srcDir = stageBundleDir();
    const outFile = join(srcDir, '..', `bundle-${Date.now()}.tar.gz`);
    const extractDir = mkdtempSync(join(tmpdir(), 'walkeros-archive-out-'));

    try {
      await packBundleDir(srcDir, outFile, [
        'flow.mjs',
        'node_modules',
        'package.json',
      ]);
      expect(existsSync(outFile)).toBe(true);

      // gzip magic bytes — proves it is a real gzip stream.
      const head = readFileSync(outFile).subarray(0, 2);
      expect(head[0]).toBe(0x1f);
      expect(head[1]).toBe(0x8b);

      await tarExtract({ cwd: extractDir, file: outFile });

      // Entries round-trip relative to the packed dir (no absolute paths).
      expect(existsSync(join(extractDir, 'flow.mjs'))).toBe(true);
      expect(existsSync(join(extractDir, 'package.json'))).toBe(true);
      expect(
        existsSync(join(extractDir, 'node_modules', 'demo-pkg', 'index.js')),
      ).toBe(true);

      expect(readFileSync(join(extractDir, 'flow.mjs'), 'utf-8')).toBe(
        'export default function flow() {}\n',
      );
    } finally {
      rmSync(srcDir, { recursive: true, force: true });
      rmSync(outFile, { force: true });
      rmSync(extractDir, { recursive: true, force: true });
    }
  });

  it('packs only the given entries (omitting node_modules)', async () => {
    const srcDir = mkdtempSync(join(tmpdir(), 'walkeros-archive-src-'));
    writeFileSync(join(srcDir, 'flow.mjs'), 'export default function f() {}\n');
    writeFileSync(join(srcDir, 'package.json'), '{"type":"module"}');
    const outFile = join(srcDir, '..', `bundle-no-nm-${Date.now()}.tar.gz`);
    const extractDir = mkdtempSync(join(tmpdir(), 'walkeros-archive-out-'));

    try {
      await packBundleDir(srcDir, outFile, ['flow.mjs', 'package.json']);
      expect(existsSync(outFile)).toBe(true);

      await tarExtract({ cwd: extractDir, file: outFile });
      expect(existsSync(join(extractDir, 'flow.mjs'))).toBe(true);
      expect(existsSync(join(extractDir, 'package.json'))).toBe(true);
      expect(existsSync(join(extractDir, 'node_modules'))).toBe(false);
    } finally {
      rmSync(srcDir, { recursive: true, force: true });
      rmSync(outFile, { force: true });
      rmSync(extractDir, { recursive: true, force: true });
    }
  });
});
