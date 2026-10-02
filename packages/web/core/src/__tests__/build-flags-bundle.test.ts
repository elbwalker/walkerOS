/**
 * `__WALKEROS_OBSERVE__` folding in getEnv, end to end: the package dist
 * (esbuild plus terser, as tsup builds it) bundled for the browser with and
 * without the flag defined false. The observe recorder is core's Proxy-based
 * `observeEnv`, so `new Proxy` marks it.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { minify } from 'terser';

// __tests__ -> src -> core -> web -> packages -> root
const repoRoot = path.resolve(__dirname, '../../../../..');
const nodeModules = path.join(repoRoot, 'node_modules');
const esbuildBin = path.join(nodeModules, '.bin', 'esbuild');

/**
 * The esbuild binary in a child process: the jsdom test environment breaks
 * esbuild's in-process JS API (its Uint8Array realm check fails).
 */
function esbuild(args: string[]): string {
  return execFileSync(esbuildBin, [...args, '--log-level=error'], {
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: nodeModules },
  });
}

describe('__WALKEROS_OBSERVE__ folds the getEnv recorder', () => {
  let tmpDir: string;

  function browserBundle(define: string[]): string {
    return esbuild([
      path.join(tmpDir, 'entry.mjs'),
      '--bundle',
      '--format=iife',
      '--platform=browser',
      '--target=es2020',
      '--minify',
      ...define,
    ]);
  }

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walkeros-flags-'));
    const bundled = esbuild([
      path.resolve(__dirname, '../index.ts'),
      '--bundle',
      '--format=esm',
      '--platform=neutral',
      '--external:@walkeros/core',
    ]);
    const { code } = await minify(bundled, { module: true });
    if (!code) throw new Error('terser produced no output');
    fs.writeFileSync(path.join(tmpDir, 'web-core.mjs'), code);
    fs.writeFileSync(
      path.join(tmpDir, 'entry.mjs'),
      "import { getEnv } from './web-core.mjs';\nglobalThis.getEnv = getEnv;\n",
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('keeps the recorder with the flag absent', () => {
    expect(browserBundle([])).toContain('new Proxy');
  });

  it('removes the recorder with the flag false', () => {
    expect(
      browserBundle(['--define:__WALKEROS_OBSERVE__=false']),
    ).not.toContain('new Proxy');
  });
});
