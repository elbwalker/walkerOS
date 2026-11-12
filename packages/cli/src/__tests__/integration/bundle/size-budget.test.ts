/**
 * Size budget and lean-bundle regression test, on this working tree.
 *
 * Guards three regressions at once:
 *   1. Size blow-up: the minimal cdn IIFE must stay within its raw and gzip
 *      budgets.
 *   2. Build flags: a bundle built from a flow file ships no unused feature
 *      and no unresolved `__WALKEROS_` flag; a skeleton from an older CLI
 *      keeps every feature. The Observe reporter ships only in a wrap given
 *      `observe`, never because a flow file names `collector.observe`.
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
// Measured 2026-11-12 on the 4.9.0 working tree (minimal flow, every build
// flag off): 114,488 B raw, 40,256 B gzip (level 9), grown by the delivery
// counts every collector keeps (latency buckets, skip and drop reasons) and
// the Observe reporter's hooks outside its flag (the logger's mask, the
// notice for an ignored observe block).
const RAW_BUDGET_BYTES = 121_000;
const GZIP_BUDGET_BYTES = 43_000;

/**
 * One string per other build flag that only its guarded code carries: store
 * setup, the state engine and runtime step validation.
 */
const FEATURE_MARKERS = [
  'caches with namespace',
  '[state] operation failed',
  'OBSOLETE_CODE_STRING',
];

/**
 * Strings only the Observe reporter carries: its option check, its transport,
 * a usage metric and the cause log's tracking for it (a property name that
 * survives minification).
 */
const REPORTER_MARKERS = [
  'not an observe option',
  'application/x-ndjson',
  'dropped_consent',
  'firstAt',
];

/** A build flag the bundler left unresolved. */
const UNRESOLVED_FLAG = /__WALKEROS_(OBSERVE|STORES|STATE|VALIDATE)__/;

const LOCAL_FLOW = withLocalPackages(MINIMAL_FLOW);

/** The minimal flow, naming its own reporter options in its file. */
const OBSERVED_FLOW = withLocalPackages({
  ...MINIMAL_FLOW,
  flows: {
    default: {
      ...MINIMAL_FLOW.flows.default,
      collector: {
        observe: {
          usage: {
            url: 'https://ingest.example.com/usage',
            token: 'wos_usage_t1_flow',
          },
          preview: {
            url: 'https://ingest.example.com/preview',
            token: 'wos_preview_t1_flow',
          },
        },
      },
    },
  },
});

const PREVIEW = {
  url: 'https://ingest.example.com/preview',
  token: 'wos_preview_t1_wrap',
};

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
    for (const marker of FEATURE_MARKERS) expect(cdn).not.toContain(marker);
    for (const marker of REPORTER_MARKERS) expect(cdn).not.toContain(marker);
    expect(cdn).not.toMatch(UNRESOLVED_FLAG);
  });

  it('cdn target of a flow that names collector.observe ships no reporter', async () => {
    const observed = await readFile(
      await build(OBSERVED_FLOW, 'cdn', 'observed.js'),
      'utf8',
    );
    for (const marker of REPORTER_MARKERS)
      expect(observed).not.toContain(marker);
    expect(observed).not.toMatch(UNRESOLVED_FLAG);
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

    it('a wrap has no unused feature', async () => {
      const plainPath = join(tmpDir, 'plain.js');
      await wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath: plainPath,
      });
      const plain = await readFile(plainPath, 'utf8');

      for (const marker of FEATURE_MARKERS) expect(plain).not.toContain(marker);
      for (const marker of REPORTER_MARKERS)
        expect(plain).not.toContain(marker);
      expect(plain).not.toMatch(UNRESOLVED_FLAG);
    }, 120000);

    it('a preview wrap carries the reporter', async () => {
      // Also the proof that each reporter marker above is real.
      const outputPath = join(tmpDir, 'preview.js');
      await wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath,
        observe: { preview: PREVIEW },
      });
      const preview = await readFile(outputPath, 'utf8');

      for (const marker of REPORTER_MARKERS) expect(preview).toContain(marker);
      for (const marker of FEATURE_MARKERS)
        expect(preview).not.toContain(marker);
      expect(preview).not.toMatch(UNRESOLVED_FLAG);
    }, 120000);

    it('an older skeleton without needs wraps with every feature but the reporter', async () => {
      // A skeleton from an older CLI has no needs marker, so the wrap turns
      // every flag on but the reporter's, which only `observe` turns on. This
      // is also the proof that each feature marker above is real: the same
      // packages carry all of them when their flag is on.
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

      for (const marker of FEATURE_MARKERS) expect(full).toContain(marker);
      for (const marker of REPORTER_MARKERS) expect(full).not.toContain(marker);
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
