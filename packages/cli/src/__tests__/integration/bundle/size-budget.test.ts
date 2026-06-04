/**
 * Size budget regression test.
 *
 * Guards against two regressions at once:
 *   1. Size blow-up: the cdn IIFE must stay within the budget.
 *   2. Dev/zod leakage: the cdn and cdn-skeleton outputs must be free of any
 *      runtime-schema / zod markers that would indicate the /dev graph got
 *      inlined. The cdn-skeleton legitimately carries the lazy `/dev` registry
 *      as a literal `import('<pkg>/dev')`, but that subpath stays external, so
 *      the zod/schema body must not appear inline.
 *
 * Baseline: CDN direct IIFE = 70,560 bytes. Budget = baseline × 1.10.
 */
import { readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { bundle } from '../../../commands/bundle/index.js';
import { MINIMAL_FLOW } from '../../fixtures/minimal-flow.js';

// Current CDN IIFE size is 70,560 bytes for the minimal web flow: core +
// collector (event engine, mapping, cache, consent, spans) plus the browser
// source and api destination. Budget = 70,560 × 1.10 headroom. Guards against
// sudden growth; bump it deliberately only when a real feature lands.
const SIZE_BUDGET_BYTES = 77616;

describe('CDN bundle size budget', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-size-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('cdn target stays within size budget', async () => {
    const out = join(tmpDir, 'walker.js');
    await bundle(MINIMAL_FLOW, {
      target: 'cdn',
      silent: true,
      buildOverrides: { output: out },
    });
    const text = await readFile(out, 'utf8');
    const size = Buffer.byteLength(text, 'utf8');
    expect(size).toBeLessThan(SIZE_BUDGET_BYTES);
  }, 120000);

  it('cdn target contains no dev code markers', async () => {
    const out = join(tmpDir, 'walker.js');
    await bundle(MINIMAL_FLOW, {
      target: 'cdn',
      silent: true,
      buildOverrides: { output: out },
    });
    const text = await readFile(out, 'utf8');

    // Zod runtime + JSON-Schema converter surface
    expect(text).not.toMatch(/\b_zod\b/);
    expect(text).not.toMatch(/\bZodObject\b/);
    expect(text).not.toMatch(/\bZodString\b/);
    expect(text).not.toContain('toJSONSchema');
    expect(text).not.toContain('$schema');
    expect(text).not.toContain('json-schema.org');

    // Internal validators
    expect(text).not.toMatch(/\bvalidateFlow\b/);
    expect(text).not.toMatch(/\bvalidateFlowConfig\b/);

    // Dev entry import paths — guard against future re-export sneaking
    expect(text).not.toContain('@walkeros/core/dev');
    expect(text).not.toMatch(/@walkeros\/[\w-]+\/dev/);
  }, 120000);

  it('cdn-skeleton carries the lazy /dev registry without inlining the zod graph', async () => {
    const out = join(tmpDir, 'skel.mjs');
    await bundle(MINIMAL_FLOW, {
      target: 'cdn-skeleton',
      silent: true,
      buildOverrides: { output: out },
    });
    const text = await readFile(out, 'utf8');

    // The /dev subpath stays external, so the zod/schema body is NOT inlined.
    expect(text).not.toMatch(/\b_zod\b/);
    expect(text).not.toContain('toJSONSchema');

    // The lazy registry survives as a literal `import('<pkg>/dev')`; the deploy
    // wrap DCEs it. The browser skeleton externalizes the subpath so the /dev
    // graph never inlines.
    expect(text).toContain('__devExports');
    expect(text).toMatch(/import\(["']@walkeros\/[\w-]+\/dev["']\)/);
  }, 120000);

  it('simulate target DOES include dev schemas (regression guard)', async () => {
    // Ensures we don't accidentally strip dev from simulate/push paths
    // that need them. esbuild tree-shakes away the literal '/dev' import
    // specifiers, so check for the compiled marker: __devExports is the
    // aggregator object emitted only when withDev=true.
    const out = join(tmpDir, 'sim.mjs');
    await bundle(MINIMAL_FLOW, {
      target: 'simulate',
      silent: true,
      buildOverrides: { output: out },
    });
    const text = await readFile(out, 'utf8');
    expect(text).toContain('__devExports');
  }, 120000);
});
