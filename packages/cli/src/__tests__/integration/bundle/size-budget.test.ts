/**
 * Task 6: Size budget regression test.
 *
 * Guards against two regressions at once:
 *   1. Size blow-up: the cdn IIFE must stay within the baseline budget.
 *   2. Dev/zod leakage: the cdn and cdn-skeleton outputs must be free of any
 *      runtime-schema / zod markers that would indicate dev imports snuck in.
 *
 * Baseline: CDN direct IIFE = 50,479 bytes (clean). Budget = baseline × 1.15.
 */
import { readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { bundle } from '../../../commands/bundle/index.js';
import { MINIMAL_FLOW } from '../../fixtures/minimal-flow.js';

// Budget from Task 0 baseline measurement: 50,479 bytes × 1.15 headroom.
const SIZE_BUDGET_BYTES = 58051;

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

  it('cdn-skeleton target is clean of the same markers', async () => {
    const out = join(tmpDir, 'skel.mjs');
    await bundle(MINIMAL_FLOW, {
      target: 'cdn-skeleton',
      silent: true,
      buildOverrides: { output: out },
    });
    const text = await readFile(out, 'utf8');

    expect(text).not.toMatch(/\b_zod\b/);
    expect(text).not.toContain('toJSONSchema');
    expect(text).not.toMatch(/@walkeros\/[\w-]+\/dev/);
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
