import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import {
  wrapSkeleton,
  extractDevExternals,
} from '../../../commands/bundle/wrap.js';

/**
 * wrapSkeleton consumes a Stage 1 skeleton ESM file that exports
 * `wireConfig`, `startFlow`, and `__configData`, and produces either a
 * browser IIFE or a node factory module.
 */
describe('wrapSkeleton', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrap-skeleton-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir).catch(() => {});
  });

  async function writeFakeSkeleton(filename = 'skeleton.mjs'): Promise<string> {
    const skeletonPath = path.join(tmpDir, filename);
    const contents = `
export function wireConfig(d) { return d; }
export function startFlow(c) {
  return Promise.resolve({
    collector: { config: c, sources: {} },
    elb: function elb() { return { ok: true }; }
  });
}
export const __configData = { test: true };
`;
    await fs.writeFile(skeletonPath, contents);
    return skeletonPath;
  }

  it('wraps a browser skeleton into a self-executing IIFE', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      windowCollector: 'walker',
      windowElb: 'elb',
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');

    // Self-executing IIFE wrapper
    expect(output).toContain('(async () =>');
    // Bootstrap call — wireConfig produces `config`, then startFlow(config)
    expect(output).toMatch(/wireConfig\s*\(\s*__configData\s*\)/);
    expect(output).toMatch(/startFlow\s*\(\s*\w+\s*\)/);
    // Collector window assignment (esbuild may normalize quote style).
    expect(output).toMatch(/window\[['"]walker['"]\]/);
    // windowElb no longer emits its own assignment; the browser source is the
    // single writer of window[settings.elb].
    expect(output).not.toMatch(/window\[['"]elb['"]\]/);
    // No top-level ESM exports — everything is wrapped
    expect(output).not.toMatch(/^export\s/m);
    // __configData was pulled from the skeleton (not inlined by caller)
    expect(output).toContain('test');
  });

  it('omits window assignments when collector/elb names are not provided', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');
    // Default window names ('collector' and 'elb') are NOT assumed — the
    // wrap step should only emit assignments for explicitly named windows.
    // (Matches the behavior of generateWebEntry.)
    expect(output).not.toMatch(/window\[['"]collector['"]\]/);
  });

  it('wraps a node skeleton into a default-export factory module', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'bundle.mjs');

    await wrapSkeleton({
      skeletonPath,
      platform: 'node',
      outputPath,
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');

    // Default export factory
    expect(output).toMatch(/export\s*{[^}]*as default/);
    // Bootstrap imports __configData from skeleton
    expect(output).toContain('wireConfig');
    expect(output).toContain('startFlow');
    // Server-path should contain the context handling boilerplate
    expect(output).toContain('sourceSettings');
    expect(output).toContain('httpHandler');
  });

  it('a plain browser wrap contains no baked observer machinery or poll loop', async () => {
    // The baked-token telemetry path no longer exists as an input, so every
    // wrapped browser bundle must be free of observer installs and trace-poll
    // machinery; observation wiring is the bake-nothing `observe` connect
    // config alone, installed by the runtime at boot.
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');
    expect(output).not.toMatch(/observers\.add/);
    expect(output).not.toContain('config.hooks');
    expect(output).not.toMatch(/setInterval/);
    expect(output).not.toMatch(/\/trace\//);
  });

  it('preview wrap bakes only public connect values, never an ingest token literal', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
      previewGrantTargets: ['api'],
      observe: {
        url: 'https://observer.example.com',
        binding: 'pb_a',
        flowId: 'flow_x',
        level: 'trace',
      },
    });

    const output = await fs.readFile(outputPath, 'utf-8');

    // The STATIC connect module bakes ONLY the public values.
    expect(output).toContain('config.observe');
    expect(output).toContain('https://observer.example.com');
    expect(output).toContain('pb_a');
    expect(output).toContain('flow_x');
    // Former bake sites: no credential prefix, no bearer literal, no
    // ingest-token-shaped string anywhere in the wrapped preview output. The
    // per-session secret arrives via the elbObserve slot at boot instead
    // (startFlow's connect module; pinned in the collector's observe tests).
    expect(output).not.toMatch(/obsw_/);
    expect(output).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
    expect(output).not.toMatch(/ingestToken|tok_/);
    // And no baked observer machinery: the runtime installs it at boot.
    expect(output).not.toMatch(/observers\.add/);
  });

  it('preview artifact output still never bakes the activator (anti-recursion)', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
      previewGrantTargets: ['api'],
      observe: { url: 'https://observer.example.com', binding: 'pb_a' },
    });

    const output = await fs.readFile(outputPath, 'utf-8');
    expect(output).not.toContain('browserSwapActivator');
  });

  it('throws when the skeleton does not exist', async () => {
    const outputPath = path.join(tmpDir, 'walker.js');
    await expect(
      wrapSkeleton({
        skeletonPath: path.join(tmpDir, 'does-not-exist.mjs'),
        platform: 'browser',
        outputPath,
      }),
    ).rejects.toThrow(/skeleton not found/i);
  });
});

describe('extractDevExternals', () => {
  it('returns the unique `<pkg>/dev` specifiers from a two-entry registry', () => {
    const skeleton = `
export const __devExports = {
  '@walkeros/web-source-browser': () => import('@walkeros/web-source-browser/dev'),
  "@walkeros/destination-demo": () => import("@walkeros/destination-demo/dev"),
};
`;
    expect(extractDevExternals(skeleton).sort()).toEqual([
      '@walkeros/destination-demo/dev',
      '@walkeros/web-source-browser/dev',
    ]);
  });

  it('returns [] for a cdn-shaped skeleton with no registry', () => {
    const skeleton = `
export function wireConfig(d) { return d; }
export const __configData = { test: true };
`;
    expect(extractDevExternals(skeleton)).toEqual([]);
  });
});
