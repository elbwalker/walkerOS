import { execFile } from 'child_process';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Server-flow simulate runs a prebuilt node skeleton whose `@walkeros/*` step
 * packages stay EXTERNAL bare imports (no inlining). Those externals are
 * resolved at `import()` time from a sibling `node_modules/` that the build
 * traced next to `skeleton.mjs`.
 *
 * Node ESM resolves bare specifiers by walking `node_modules` up from the
 * IMPORTING FILE's directory, independent of `process.cwd()` and unaffected by
 * the cache-busting `?t=` query `withFlowContext` appends. So a skeleton plus
 * its co-located sibling `node_modules/` resolves with no CLI change; a
 * skeleton alone in a bare directory cannot resolve its externals. Callers
 * (the app's skeleton-archive extraction) MUST co-locate `skeleton.mjs` and
 * its sibling `node_modules/`.
 *
 * These run in a real `node` child process, NOT under Jest: Jest hijacks
 * dynamic `import()` through its own resolver, which masks native ESM bare
 * resolution (it walks directories itself and throws its own error class). The
 * child imports the built `simulateDestination` from dist so the assertions
 * reflect the actual runtime the app's simulate-server container uses.
 */
describe('co-located external resolution (real node child process)', () => {
  const distIndex = resolve(__dirname, '../../../../dist/index.js');
  let dir: string;

  /**
   * Stage a fake external step package under `<root>/node_modules/<name>`.
   * `destinationDemo` is a minimal walkerOS destination whose push records the
   * event into a module-level capture readable after the run.
   */
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

  /**
   * Write a node skeleton matching the FlowModule contract: a bare external
   * import, `wireConfig`, and `startFlow` returning a collector that records
   * pushes. `simulateDestination` calls `wireConfig` then `startFlow`, verifies
   * the destination exists, and pushes through the collector.
   */
  function writeSkeleton(skeletonDir: string): string {
    const skeletonPath = join(skeletonDir, 'skeleton.mjs');
    writeFileSync(
      skeletonPath,
      `import { stepMarker } from '@walkeros/fake-external-step';

export const __configData = {
  destinations: { demo: { config: {} } },
};

export function wireConfig(data) {
  return {
    sources: {},
    destinations: { demo: { config: {} } },
    __marker: stepMarker(),
  };
}

export async function startFlow(config) {
  const captured = [];
  const collector = {
    destinations: { demo: { type: 'fake', config: {} } },
    pending: { destinations: {} },
    push: async (event) => {
      captured.push(event);
    },
    command: async () => {},
    __captured: captured,
    __marker: config.__marker,
  };
  return { collector };
}
`,
      'utf-8',
    );
    return skeletonPath;
  }

  /**
   * Drive the built `simulateDestination` against `bundlePath` in a fresh node
   * process whose cwd is `cwdDir` (no node_modules of its own), printing a
   * single JSON line of the outcome.
   */
  function runnerScript(bundlePath: string): string {
    return `
import { simulateDestination } from ${JSON.stringify(distIndex)};
const config = {
  version: 4,
  flows: {
    default: {
      destinations: { demo: { package: '@walkeros/fake-external-step' } },
      config: { platform: 'server' },
    },
  },
};
try {
  const result = await simulateDestination(
    config,
    { name: 'page view', data: { title: 'Home' } },
    { destinationId: 'demo', bundlePath: ${JSON.stringify(bundlePath)}, silent: true },
  );
  process.stdout.write(JSON.stringify({ outcome: 'ok', result }));
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      outcome: 'throw',
      code: error && error.code,
      message: error && error.message,
    }),
  );
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
    const parsed = JSON.parse(stdout) as {
      outcome: string;
      result?: { step?: string; error?: unknown };
    };

    expect(parsed.outcome).toBe('ok');
    expect(parsed.result?.step).toBe('destination');
    // A resolution failure surfaces as an `error` on the Simulation.Result.
    expect(parsed.result?.error).toBeUndefined();
  }, 90000);

  it('fails to resolve when the skeleton has no sibling node_modules', async () => {
    const bareDir = join(dir, 'bare');
    mkdirSync(bareDir, { recursive: true });
    const skeletonPath = writeSkeleton(bareDir);

    const { stdout } = await runInNode(runnerScript(skeletonPath), bareDir);
    const parsed = JSON.parse(stdout) as {
      outcome: string;
      result?: { step?: string; error?: { code?: string } };
    };

    // simulateDestination wraps the import failure into the Result's `error`
    // field rather than throwing. The native ESM error code proves real
    // bare-resolution failure (not a Jest-resolver artifact).
    expect(parsed.outcome).toBe('ok');
    expect(parsed.result?.error).toBeDefined();
    expect(parsed.result?.error?.code).toBe('ERR_MODULE_NOT_FOUND');
  }, 90000);
});
