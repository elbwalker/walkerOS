/**
 * Size budget and lean-bundle regression test, on this working tree.
 *
 * Guards three regressions at once:
 *   1. Size blow-up: the minimal cdn IIFE must stay within its raw and gzip
 *      budgets.
 *   2. Build flags: a flow without observe ships no observe recorder and no
 *      unresolved `__WALKEROS_` flag, while an observed bundle or wrap keeps
 *      the recorder.
 *   3. Dev/zod leakage: the cdn and cdn-skeleton outputs must be free of any
 *      runtime-schema / zod markers that would indicate the /dev graph got
 *      inlined. The cdn-skeleton legitimately carries the lazy `/dev` registry
 *      as a literal `import('<pkg>/dev')`, but that subpath stays external, so
 *      the zod/schema body must not appear inline.
 *
 * Every @walkeros package is bundled from the monorepo's built dist
 * (`withLocalPackages`), so a regression fails here before it is published.
 */
import { readFile, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { gzipSync } from 'zlib';

import { bundle } from '../../../commands/bundle/index.js';
import { wrapSkeleton } from '../../../commands/bundle/wrap.js';
import { MINIMAL_FLOW } from '../../fixtures/minimal-flow.js';
import { withLocalPackages } from '../../helpers/local-packages.js';

// Budget rule, raw and gzip: the measured size × 1.05, rounded up to the next
// 1,000 B. Bump only in a PR that names the feature that grew the bundle.
// Measured 2026-10-02 on the 4.7.0 working tree (minimal flow, every build
// flag off): 93,207 B raw, 32,366 B gzip (level 9).
const RAW_BUDGET_BYTES = 98_000;
const GZIP_BUDGET_BYTES = 34_000;

/** Strings only the observe recorder (connect, poster, call capture) carries. */
const RECORDER_MARKERS = ['elbObserve', '/ingest/', 'X-Walkeros-Binding'];

/**
 * One string per other build flag that only its guarded code carries: store
 * setup, the state engine and runtime step validation.
 */
const FEATURE_MARKERS = [
  'caches with namespace',
  '[state] operation failed',
  'OBSOLETE_CODE_STRING',
];

/** A build flag the bundler left unresolved. */
const UNRESOLVED_FLAG = /__WALKEROS_(OBSERVE|STORES|STATE|VALIDATE)__/;

const OBSERVE = { url: 'https://obs.example', binding: 'pb_x' };

const LOCAL_FLOW = withLocalPackages(MINIMAL_FLOW);

const OBSERVED_FLOW = withLocalPackages({
  ...MINIMAL_FLOW,
  flows: {
    default: {
      ...MINIMAL_FLOW.flows.default,
      config: { platform: 'web', observe: OBSERVE },
    },
  },
});

describe('CDN bundle size budget', () => {
  let tmpDir: string;
  let cdn: string;

  async function build(
    config: unknown,
    target: 'cdn' | 'cdn-skeleton' | 'simulate',
    name: string,
  ): Promise<string> {
    const out = join(tmpDir, name);
    await bundle(config, {
      target,
      silent: true,
      cache: false,
      buildOverrides: { output: out },
    });
    return out;
  }

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-size-'));
    cdn = await readFile(await build(LOCAL_FLOW, 'cdn', 'walker.js'), 'utf8');
  }, 120000);

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('cdn target stays within the raw and gzip budgets', () => {
    const bytes = Buffer.from(cdn, 'utf8');
    expect(bytes.length).toBeLessThan(RAW_BUDGET_BYTES);
    expect(gzipSync(bytes, { level: 9 }).length).toBeLessThan(
      GZIP_BUDGET_BYTES,
    );
  });

  it('cdn target ships no unused feature and no unresolved build flag', () => {
    for (const marker of [...RECORDER_MARKERS, ...FEATURE_MARKERS])
      expect(cdn).not.toContain(marker);
    expect(cdn).not.toMatch(UNRESOLVED_FLAG);
  });

  it('an observed flow keeps the recorder', async () => {
    const text = await readFile(
      await build(OBSERVED_FLOW, 'cdn', 'observed.js'),
      'utf8',
    );
    for (const marker of RECORDER_MARKERS) expect(text).toContain(marker);
    for (const marker of FEATURE_MARKERS) expect(text).not.toContain(marker);
    expect(text).not.toMatch(UNRESOLVED_FLAG);
  }, 120000);

  it('cdn target contains no dev code markers', () => {
    // Zod runtime + JSON-Schema converter surface
    expect(cdn).not.toMatch(/\b_zod\b/);
    expect(cdn).not.toMatch(/\bZodObject\b/);
    expect(cdn).not.toMatch(/\bZodString\b/);
    expect(cdn).not.toContain('toJSONSchema');
    expect(cdn).not.toContain('$schema');
    expect(cdn).not.toContain('json-schema.org');

    // Internal validators
    expect(cdn).not.toMatch(/\bvalidateFlow\b/);
    expect(cdn).not.toMatch(/\bvalidateFlowConfig\b/);

    // Dev entry import paths — guard against future re-export sneaking
    expect(cdn).not.toContain('@walkeros/core/dev');
    expect(cdn).not.toMatch(/@walkeros\/[\w-]+\/dev/);
  });

  describe('cdn-skeleton and its wrap', () => {
    let skeletonPath: string;
    let skeleton: string;

    beforeAll(async () => {
      skeletonPath = await build(LOCAL_FLOW, 'cdn-skeleton', 'skel.mjs');
      skeleton = await readFile(skeletonPath, 'utf8');
    }, 120000);

    it('carries the lazy /dev registry without inlining the zod graph', () => {
      // The /dev subpath stays external, so the zod/schema body is NOT inlined.
      expect(skeleton).not.toMatch(/\b_zod\b/);
      expect(skeleton).not.toContain('toJSONSchema');

      // The lazy registry survives as a literal `import('<pkg>/dev')`; the
      // deploy wrap DCEs it. The browser skeleton externalizes the subpath so
      // the /dev graph never inlines.
      expect(skeleton).toContain('__devExports');
      expect(skeleton).toMatch(/import\(["']@walkeros\/[\w-]+\/dev["']\)/);
    });

    it('ends with the needs the wrap defines the build flags from', () => {
      expect(skeleton.trimEnd()).toMatch(
        /\/\* walkeros:needs \{"observe":false,"stores":false,"state":false\} \*\/$/,
      );
    });

    it('a plain wrap has no recorder; an observed wrap keeps it', async () => {
      const plainPath = join(tmpDir, 'plain.js');
      const observedPath = join(tmpDir, 'observed-wrap.js');
      await wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath: plainPath,
      });
      await wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath: observedPath,
        observe: OBSERVE,
      });
      const plain = await readFile(plainPath, 'utf8');
      const observed = await readFile(observedPath, 'utf8');

      for (const marker of RECORDER_MARKERS) {
        expect(plain).not.toContain(marker);
        expect(observed).toContain(marker);
      }
      for (const marker of FEATURE_MARKERS) expect(plain).not.toContain(marker);
      expect(plain).not.toMatch(UNRESOLVED_FLAG);
      expect(observed).not.toMatch(UNRESOLVED_FLAG);
    }, 120000);

    it('an older skeleton without needs wraps with every feature', async () => {
      // A skeleton from an older CLI has no needs marker, so the wrap turns
      // every flag on. This is also the proof that each marker above is real:
      // the same packages carry all of them when their flag is on.
      const oldPath = join(tmpDir, 'old-skel.mjs');
      await writeFile(
        oldPath,
        skeleton.replace(/\/\* walkeros:needs \{[^}]*\} \*\/\s*$/, ''),
      );
      const outputPath = join(tmpDir, 'old-wrap.js');
      await wrapSkeleton({
        skeletonPath: oldPath,
        platform: 'browser',
        outputPath,
      });
      const full = await readFile(outputPath, 'utf8');

      for (const marker of [...RECORDER_MARKERS, ...FEATURE_MARKERS])
        expect(full).toContain(marker);
      expect(full).not.toMatch(UNRESOLVED_FLAG);
    }, 120000);
  });

  it('simulate target DOES include dev schemas (regression guard)', async () => {
    // Ensures we don't accidentally strip dev from simulate/push paths
    // that need them. esbuild tree-shakes away the literal '/dev' import
    // specifiers, so check for the compiled marker: __devExports is the
    // aggregator object emitted only when withDev=true.
    const text = await readFile(
      await build(LOCAL_FLOW, 'simulate', 'sim.mjs'),
      'utf8',
    );
    expect(text).toContain('__devExports');
  }, 120000);
});
