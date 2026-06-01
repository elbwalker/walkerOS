import { execFile } from 'child_process';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Server-flow simulate runs a prebuilt node skeleton whose `@walkeros/*` step
 * packages stay EXTERNAL bare imports (no inlining). The CLI's `withFlowContext`
 * loads the skeleton with `import(pathToFileURL(esmPath) + '?t=<n>')`. Node ESM
 * resolves those bare specifiers by walking `node_modules` up from the IMPORTING
 * FILE's directory, independent of `process.cwd()` and unaffected by the `?t=`
 * cache-busting query. So a skeleton plus its co-located sibling `node_modules/`
 * resolves; a skeleton alone in a bare directory cannot. Callers (the app's
 * skeleton-archive extraction) MUST co-locate `skeleton.mjs` and its sibling
 * `node_modules/`.
 *
 * The assertions run in a real `node` child process, NOT under Jest: Jest
 * hijacks dynamic `import()` through its own resolver, which masks native ESM
 * bare resolution (it walks directories itself and throws its own error class).
 * The child imports the skeleton the exact way `withFlowContext` does, so the
 * test exercises the real runtime resolution the simulate-server relies on,
 * with no dependency on the CLI's built dist.
 */
describe('co-located external resolution (real node child process)', () => {
  let dir: string;

  /** Stage a fake external step package under `<root>/node_modules/<name>`. */
  function stageExternalStep(root: string): void {
    const pkgDir = join(
      root,
      'node_modules',
      '@walkeros',
      'fake-external-step',
    );
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name: '@walkeros/fake-external-step',
        version: '0.0.0',
        type: 'module',
        main: 'index.mjs',
        exports: { '.': './index.mjs' },
      }),
    );
    writeFileSync(
      join(pkgDir, 'index.mjs'),
      `export const stepMarker = () => 'resolved-from-sibling';\n`,
      'utf-8',
    );
  }

  /** A minimal node skeleton with a bare external import, like the real one. */
  function writeSkeleton(skeletonDir: string): string {
    const skeletonPath = join(skeletonDir, 'skeleton.mjs');
    writeFileSync(
      skeletonPath,
      `import { stepMarker } from '@walkeros/fake-external-step';\nexport const marker = stepMarker();\n`,
      'utf-8',
    );
    return skeletonPath;
  }

  /**
   * Import the skeleton exactly as `withFlowContext` does: a `file://` URL with
   * a cache-busting `?t=` query. Print a single JSON line of the outcome.
   */
  function runnerScript(skeletonPath: string): string {
    return `
import { pathToFileURL } from 'url';
const url = pathToFileURL(${JSON.stringify(skeletonPath)}).href + '?t=' + Date.now();
try {
  const mod = await import(url);
  process.stdout.write(JSON.stringify({ outcome: 'ok', marker: mod.marker }));
} catch (error) {
  process.stdout.write(JSON.stringify({ outcome: 'throw', code: error && error.code }));
}
`;
  }

  async function runInNode(
    script: string,
    cwdDir: string,
  ): Promise<{ stdout: string }> {
    return execFileAsync('node', ['--input-type=module', '-e', script], {
      cwd: cwdDir,
    });
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-co-located-'));
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('resolves the bare external from the skeleton sibling node_modules', async () => {
    const skeletonDir = join(dir, 'skel');
    mkdirSync(skeletonDir, { recursive: true });
    stageExternalStep(skeletonDir);
    const skeletonPath = writeSkeleton(skeletonDir);

    // cwd is an unrelated directory with no node_modules, proving resolution
    // does not depend on process.cwd(), only the imported file's location.
    const elsewhere = join(dir, 'unrelated-cwd');
    mkdirSync(elsewhere, { recursive: true });

    const { stdout } = await runInNode(runnerScript(skeletonPath), elsewhere);
    const parsed = JSON.parse(stdout) as { outcome: string; marker?: string };

    expect(parsed.outcome).toBe('ok');
    expect(parsed.marker).toBe('resolved-from-sibling');
  });

  it('fails to resolve when the skeleton has no sibling node_modules', async () => {
    const bareDir = join(dir, 'bare');
    mkdirSync(bareDir, { recursive: true });
    const skeletonPath = writeSkeleton(bareDir);

    const { stdout } = await runInNode(runnerScript(skeletonPath), bareDir);
    const parsed = JSON.parse(stdout) as { outcome: string; code?: string };

    // The native ESM error code proves a real bare-resolution failure, not a
    // Jest-resolver artifact.
    expect(parsed.outcome).toBe('throw');
    expect(parsed.code).toBe('ERR_MODULE_NOT_FOUND');
  });
});
