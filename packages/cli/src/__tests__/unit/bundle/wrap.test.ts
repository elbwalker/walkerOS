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

  it('loads Tag Mode from production unless a deploy passes another target', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const read = async (name: string, moin?: { app: string; base: string }) => {
      const outputPath = path.join(tmpDir, name);
      await wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath,
        minify: false,
        ...(moin ? { moin } : {}),
      });
      return fs.readFile(outputPath, 'utf-8');
    };

    const production = await read('production.js');
    expect(production).toContain('"https://app.walkeros.io"');
    expect(production).toContain('"https://cdn.walkeros.io/tag-mode/"');
    expect(production).not.toContain('stage.');

    const stage = await read('stage.js', {
      app: 'https://stage.app.walkeros.io',
      base: 'https://stage.cdn.walkeros.io/tag-mode/',
    });
    // The call keeps its literals; the minified core renames `moin`.
    expect(stage).toMatch(
      /\w+\(\{\s*app: "https:\/\/stage\.app\.walkeros\.io",\s*base: "https:\/\/stage\.cdn\.walkeros\.io\/tag-mode\/"\s*\}\)/,
    );
  });

  it('refuses a malformed Tag Mode target', async () => {
    const skeletonPath = await writeFakeSkeleton();
    await expect(
      wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath: path.join(tmpDir, 'walker.js'),
        moin: {
          app: 'http://localhost:3000',
          base: 'http://localhost:9001/tag-mode/',
        },
      }),
    ).rejects.toThrow(/Invalid moin\.app/);
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

/**
 * The browser wrap defines every build flag (see @walkeros/core build-flags)
 * from the needs the skeleton carries, so a flag-guarded feature the flow does
 * not use folds out of the wrapped bundle.
 */
describe('wrapSkeleton build flags', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrap-flags-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir).catch(() => {});
  });

  /** A skeleton whose config data reads each flag, plus an optional marker. */
  async function flagSkeleton(marker = ''): Promise<string> {
    const skeletonPath = path.join(tmpDir, 'skeleton.mjs');
    await fs.writeFile(
      skeletonPath,
      `
export function wireConfig(d) { return d; }
export function startFlow(c) { return Promise.resolve({ collector: c, elb() {} }); }
export const __configData = {
  observe: __WALKEROS_OBSERVE__,
  stores: __WALKEROS_STORES__,
  state: __WALKEROS_STATE__,
  validate: __WALKEROS_VALIDATE__,
};
${marker}`,
    );
    return skeletonPath;
  }

  async function wrapText(
    options: Partial<Parameters<typeof wrapSkeleton>[0]> & {
      skeletonPath: string;
    },
  ): Promise<string> {
    const outputPath = path.join(tmpDir, 'walker.js');
    await wrapSkeleton({
      platform: 'browser',
      outputPath,
      minify: false,
      ...options,
    });
    return fs.readFile(outputPath, 'utf-8');
  }

  const LEAN =
    '/* walkeros:needs {"observe":false,"stores":false,"state":true} */';

  it('defines every flag from the skeleton needs', async () => {
    const output = await wrapText({ skeletonPath: await flagSkeleton(LEAN) });
    expect(output).toContain('observe: false');
    expect(output).toContain('stores: false');
    expect(output).toContain('state: true');
    expect(output).toContain('validate: false');
    expect(output).not.toContain('__WALKEROS_');
  });

  it('a baked observe turns observe on', async () => {
    const output = await wrapText({
      skeletonPath: await flagSkeleton(LEAN),
      observe: { url: 'https://observer.example.com', binding: 'pb_a' },
    });
    expect(output).toContain('observe: true');
  });

  it('an older skeleton without needs wraps with every flag on', async () => {
    const output = await wrapText({ skeletonPath: await flagSkeleton() });
    expect(output).toContain('observe: true');
    expect(output).toContain('stores: true');
    expect(output).toContain('state: true');
    expect(output).toContain('validate: true');
  });

  it('a node wrap defines no flags', async () => {
    const output = await wrapText({
      skeletonPath: await flagSkeleton(LEAN),
      platform: 'node',
    });
    expect(output).toContain('__WALKEROS_OBSERVE__');
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
