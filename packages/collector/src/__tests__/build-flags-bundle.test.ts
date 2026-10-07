/**
 * Build-flag folding, end to end. Emulates the package dist (esbuild bundle
 * plus terser, as tsup builds it), then the CLI browser bundle (esbuild with
 * `define`), and asserts each guarded feature's markers are gone with its flag
 * false and present with the flag absent. Terser reshapes the guards and only
 * the block or `&&` form folds, so this keeps the guard shape honest.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { minify } from 'terser';
import type { BuildFlag } from '@walkeros/core';

// __tests__ -> src -> collector -> packages -> root
const repoRoot = path.resolve(__dirname, '../../../..');
const nodeModules = path.join(repoRoot, 'node_modules');
const esbuildBin = path.join(nodeModules, '.bin', 'esbuild');
const collectorEntry = path.resolve(__dirname, '../index.ts');

const FLAGS: BuildFlag[] = [
  '__WALKEROS_OBSERVE__',
  '__WALKEROS_STORES__',
  '__WALKEROS_STATE__',
  '__WALKEROS_VALIDATE__',
];

/** Strings only the code behind each flag carries. */
const MARKERS: Record<BuildFlag, string[]> = {
  __WALKEROS_OBSERVE__: [
    'elbObserve',
    '/ingest/',
    'X-Walkeros-Binding',
    'new Proxy',
    '[unreadable]',
  ],
  __WALKEROS_STORES__: ['caches with namespace', 'Cycle in cache.store chain'],
  __WALKEROS_STATE__: ['[state] operation failed'],
  __WALKEROS_VALIDATE__: ['OBSOLETE_CODE_STRING'],
};

/** Lean-path warnings that must stay in the bundle when a flag is false. */
const WARNINGS: Partial<Record<BuildFlag, string>> = {
  __WALKEROS_OBSERVE__: 'observe: not in this build',
  __WALKEROS_STORES__: 'stores: not in this build',
  __WALKEROS_STATE__: 'state: not in this build',
};

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

let tmpDir: string;

/** The collector as its package dist ships it: esbuild ESM, then terser. */
async function packageDist(): Promise<string> {
  const bundled = esbuild([
    collectorEntry,
    '--bundle',
    '--format=esm',
    '--platform=neutral',
    '--external:@walkeros/core',
    '--define:__VERSION__="0.0.0"',
  ]);
  const { code } = await minify(bundled, { module: true });
  if (!code) throw new Error('terser produced no output');
  return code;
}

/** A minified browser bundle of that dist plus core, like CLI stage 2. */
function browserBundle(define: Partial<Record<BuildFlag, string>>): string {
  return esbuild([
    path.join(tmpDir, 'entry.mjs'),
    '--bundle',
    '--format=iife',
    '--platform=browser',
    '--target=es2020',
    '--minify',
    ...Object.entries(define).map(
      ([flag, value]) => `--define:${flag}=${value}`,
    ),
  ]);
}

const allFalse = Object.fromEntries(FLAGS.map((flag) => [flag, 'false']));

describe('build flags fold out of a browser bundle', () => {
  let absent: string;
  let lean: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walkeros-flags-'));
    fs.writeFileSync(path.join(tmpDir, 'collector.mjs'), await packageDist());
    fs.writeFileSync(
      path.join(tmpDir, 'entry.mjs'),
      "import { startFlow } from './collector.mjs';\nglobalThis.flow = startFlow;\n",
    );
    absent = browserBundle({});
    lean = browserBundle(allFalse);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it.each(FLAGS)('%s absent keeps the feature', (flag) => {
    for (const marker of MARKERS[flag]) expect(absent).toContain(marker);
  });

  it.each(FLAGS)('%s false removes the feature', (flag) => {
    for (const marker of MARKERS[flag]) expect(lean).not.toContain(marker);
    const warning = WARNINGS[flag];
    if (warning) expect(lean).toContain(warning);
  });

  it.each(FLAGS)('%s false alone removes only its own feature', (flag) => {
    const single = browserBundle({ [flag]: 'false' });
    for (const other of FLAGS) {
      for (const marker of MARKERS[other]) {
        if (other === flag) expect(single).not.toContain(marker);
        else expect(single).toContain(marker);
      }
    }
  });

  it('true behaves like absent', () => {
    const enabled = browserBundle(
      Object.fromEntries(FLAGS.map((flag) => [flag, 'true'])),
    );
    for (const flag of FLAGS) {
      for (const marker of MARKERS[flag]) expect(enabled).toContain(marker);
    }
    expect(enabled).not.toContain('not in this build');
    expect(enabled.length).toBeLessThan(absent.length);
  });

  it('records the lean saving', () => {
    // A floor, not a budget: all four flags false must cut real weight.
    expect(absent.length - lean.length).toBeGreaterThan(10_000);
  });
});
