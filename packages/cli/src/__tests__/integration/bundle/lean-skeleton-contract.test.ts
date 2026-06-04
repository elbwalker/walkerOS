/**
 * LEAN keystone contract test: catches BOTH U-lazy `/dev` resolution gaps in
 * walkerOS CI BEFORE publish, without false-passing in the full workspace.
 *
 * The existing `skeleton-contract.test.ts` and the app's `cli-contract.test.ts`
 * PASS locally because the workspace/symlinks make every `@walkeros` dev subpath
 * resolvable, so esbuild inlines + DCEs cleanly. They fail only under a lean
 * `npm ci`. This test must therefore force a genuinely lean condition or it
 * false-passes the same way.
 *
 * ── LEVER USED ───────────────────────────────────────────────────────────────
 * The wrap's esbuild resolution chain (`getNodeResolutionPaths`) walks up from
 * the CLI module location to the workspace `node_modules`, so a Jest run inside
 * the monorepo CANNOT block resolution of real `@walkeros` dev-subpath packages. We
 * therefore use the plan's documented fallback lever:
 *
 *   (1) OUTPUT-based purity: assert the browser wrap output is dev-free (no zod
 *       sentinels, no `__devExports`, no `@walkeros` dev-subpath literal, incl. .map).
 *   (2) A dedicated NEGATIVE case: a skeleton whose `__devExports` registry
 *       references a `<pkg>/dev` that is GENUINELY ABSENT from every resolution
 *       path (a fabricated package name). The browser wrap must SUCCEED. This
 *       proves externalization (not resolution) is what carries the wrap: before
 *       the Gap A fix the browser wrap set no `external`, so esbuild would try to
 *       resolve the fabricated `/dev` literal and fail with `Could not resolve`.
 *       After the fix `extractDevExternals` externalizes it and the wrap skips
 *       resolution. This is the faithful stand-in for the lean simulate-server /
 *       `npm ci` condition where a flow's `<pkg>/dev` is genuinely unresolvable.
 *
 * Gap B (web simulate host-free resolution) and the server regression guard are
 * verified directly: the web `simulate` ESM must INLINE `/dev` and resolve in a
 * tmpdir with NO co-located `node_modules`; the server `simulate` archive must
 * carry `<pkg>/dev` in its sibling nft-traced `node_modules/`.
 *
 * Sentinel discipline: deploy purity uses ONLY dev-only zod sentinels
 * (`zodToSchema`, `toJSONSchema`, `_zod`, `ZodObject`), which live solely in the
 * `/dev` zod graph. `createTrigger` is a legitimate runtime export and is used
 * ONLY for the simulate-resolution assertion, never for purity.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { x as tarExtract } from 'tar';
import { bundle } from '../../../commands/bundle/index.js';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { wrapSkeleton } from '../../../commands/bundle/wrap.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Logger } from '@walkeros/core';

// Dev-only zod-graph sentinels. Each lives ONLY in a package's `/dev` module,
// never in the runtime entry. Their presence in a wrapped deploy bundle means
// the /dev graph leaked.
const DEV_ZOD_SENTINELS = ['zodToSchema', 'toJSONSchema', '_zod', 'ZodObject'];

const WEB_PKG = '@walkeros/web-source-browser';
const SERVER_PKG = '@walkeros/server-source-fetch';

const webFlow = {
  version: 4,
  flows: {
    default: {
      sources: { browser: { package: WEB_PKG } },
      destinations: { demo: { package: '@walkeros/destination-demo' } },
      config: {
        platform: 'web',
        bundle: {
          packages: {
            '@walkeros/collector': {
              version: 'latest',
              imports: ['startFlow'],
            },
            [WEB_PKG]: { version: 'latest' },
            '@walkeros/destination-demo': { version: 'latest' },
          },
        },
      },
    },
  },
};

const serverFlow = {
  version: 4,
  flows: {
    default: {
      sources: { fetch: { package: SERVER_PKG } },
      destinations: { demo: { package: '@walkeros/destination-demo' } },
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/collector': {
              version: 'latest',
              imports: ['startFlow'],
            },
            [SERVER_PKG]: { version: 'latest' },
            '@walkeros/destination-demo': { version: 'latest' },
          },
        },
      },
    },
  },
};

describe('lean skeleton contract (both U-lazy /dev gaps, lean context)', () => {
  let tmpDir: string;
  let logger: Logger.Instance;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `lean-skeleton-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.remove(tmpDir).catch(() => {});
    jest.restoreAllMocks();
  });

  /**
   * Build a deploy skeleton (cdn-skeleton for browser, runner for node) using
   * the same flags the app ships: skipWrapper + withDev + externalizeDev=true.
   */
  async function buildDeploySkeleton(
    flow: unknown,
    platform: 'browser' | 'node',
    outPath: string,
  ): Promise<void> {
    const { flowSettings, buildOptions } = loadBundleConfig(flow, {
      configPath: path.join(tmpDir, 'flow.json'),
    });
    buildOptions.output = outPath;
    buildOptions.platform = platform;
    buildOptions.format = 'esm';
    buildOptions.skipWrapper = true;
    buildOptions.withDev = true;
    buildOptions.externalizeDev = true;
    buildOptions.cache = false;
    buildOptions.minify = false;
    await bundleCore(flowSettings, buildOptions, logger);
  }

  it('Gap A (browser deploy): wrap SUCCEEDS and output is dev-free', async () => {
    const skeletonPath = path.join(tmpDir, 'skeleton.mjs');
    await buildDeploySkeleton(webFlow, 'browser', skeletonPath);

    const wrappedPath = path.join(tmpDir, 'wrapped.js');
    // Must not throw `Could not resolve "<pkg>/dev"` — externalization carries it.
    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath: wrappedPath,
      minify: false,
      windowCollector: 'collector',
      windowElb: 'elb',
    });

    const wrappedText = await fs.readFile(wrappedPath, 'utf-8');
    for (const sentinel of DEV_ZOD_SENTINELS) {
      expect(wrappedText).not.toContain(sentinel);
    }
    expect(wrappedText).not.toContain('__devExports');
    expect(wrappedText).not.toMatch(/@walkeros\/[\w-]+\/dev/);

    const mapPath = `${wrappedPath}.map`;
    if (await fs.pathExists(mapPath)) {
      const mapText = await fs.readFile(mapPath, 'utf-8');
      for (const sentinel of DEV_ZOD_SENTINELS) {
        expect(mapText).not.toContain(sentinel);
      }
    }
  }, 120000);

  it('Gap A (negative, lean proof): browser wrap SUCCEEDS even when `<pkg>/dev` is genuinely unresolvable', async () => {
    // Build a real browser skeleton, then rewrite its `__devExports` registry to
    // reference a fabricated package whose `/dev` cannot resolve from ANY path
    // (it exists in no node_modules tree). This is the faithful lean-context
    // stand-in: pre-fix the browser wrap set no `external`, so esbuild would
    // resolve the literal `import('@walkeros/nonexistent-lean-pkg/dev')` while
    // building the graph and fail with `Could not resolve`. Externalization
    // (the Gap A fix) makes the wrap skip resolution and succeed.
    const skeletonPath = path.join(tmpDir, 'skeleton-lean.mjs');
    await buildDeploySkeleton(webFlow, 'browser', skeletonPath);

    const original = await fs.readFile(skeletonPath, 'utf-8');
    const fakeSpec = '@walkeros/nonexistent-lean-pkg/dev';
    // Inject a second registry thunk for the unresolvable package alongside the
    // real ones. Anchor on the registry object opener (esbuild emits
    // `var __devExports = {`), inserting a new thunk as its first entry.
    const anchor = /(__devExports\s*=\s*\{)/;
    expect(original).toMatch(anchor); // guard: the registry exists to inject into
    const rewritten = original.replace(
      anchor,
      `$1\n  "@walkeros/nonexistent-lean-pkg": () => import("${fakeSpec}"),`,
    );
    expect(rewritten).not.toBe(original); // guard: the injection actually landed
    expect(rewritten).toContain(fakeSpec);
    await fs.writeFile(skeletonPath, rewritten);

    const wrappedPath = path.join(tmpDir, 'wrapped-lean.js');
    // The decisive assertion: this resolves to NO throw. Pre-fix it throws
    // `Could not resolve "@walkeros/nonexistent-lean-pkg/dev"`.
    await expect(
      wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath: wrappedPath,
        minify: false,
        windowCollector: 'collector',
        windowElb: 'elb',
      }),
    ).resolves.toBeUndefined();

    const wrappedText = await fs.readFile(wrappedPath, 'utf-8');
    // The unresolvable /dev is externalized away (DCE'd), not inlined.
    expect(wrappedText).not.toContain(fakeSpec);
    expect(wrappedText).not.toContain('__devExports');
  }, 120000);

  it('Node wrap regression guard: node wrap is dev-free with no `<pkg>/dev` literal', async () => {
    const skeletonPath = path.join(tmpDir, 'node-skeleton.mjs');
    await buildDeploySkeleton(serverFlow, 'node', skeletonPath);

    const wrappedPath = path.join(tmpDir, 'node-wrapped.mjs');
    await wrapSkeleton({
      skeletonPath,
      platform: 'node',
      outputPath: wrappedPath,
      minify: false,
    });

    const wrappedText = await fs.readFile(wrappedPath, 'utf-8');
    for (const sentinel of DEV_ZOD_SENTINELS) {
      expect(wrappedText).not.toContain(sentinel);
    }
    expect(wrappedText).not.toContain('__devExports');
    expect(wrappedText).not.toMatch(/@walkeros\/[\w-]+\/dev/);
  }, 120000);

  it('Gap B (web simulate): inlined /dev resolves host-free with NO co-located node_modules', async () => {
    // The web `simulate` target (externalizeDev:false) must INLINE the /dev
    // graph so the lazy thunk resolves a bundled module — no filesystem lookup.
    const { flowSettings, buildOptions } = loadBundleConfig(webFlow, {
      configPath: path.join(tmpDir, 'flow.json'),
    });
    // `simulate` preset is node-platform but inert; platform is config-driven,
    // and a web flow resolves to browser. Mirror that: browser + externalizeDev
    // false (the simulate shape) so esbuild inlines the dev graph.
    const simulatePath = path.join(tmpDir, 'simulate.mjs');
    buildOptions.output = simulatePath;
    buildOptions.platform = 'browser';
    buildOptions.format = 'esm';
    buildOptions.skipWrapper = true;
    buildOptions.withDev = true;
    buildOptions.externalizeDev = false;
    buildOptions.cache = false;
    buildOptions.minify = false;
    await bundleCore(flowSettings, buildOptions, logger);

    const text = await fs.readFile(simulatePath, 'utf-8');
    // /dev graph is inlined: a dev-only zod symbol is present, and the literal
    // external `<pkg>/dev` import does NOT survive.
    expect(text).toContain('zodToSchema');
    expect(text).not.toMatch(
      /import\(["']@walkeros\/web-source-browser\/dev["']\)/,
    );

    // tmpDir is under os.tmpdir() with NO co-located node_modules (the lean
    // simulate-server condition). The inlined lazy thunk must resolve with zero
    // host filesystem lookups. Pre-Fix-B this would be an external literal that
    // throws MODULE_NOT_FOUND here.
    const moduleUnderTest = await import(pathToFileURL(simulatePath).href);
    const devModule = await moduleUnderTest.__devExports[WEB_PKG]();
    expect(typeof devModule.examples.createTrigger).toBe('function');
  }, 120000);

  it('Server simulate regression guard: archive sibling node_modules carries `<pkg>/dev`', async () => {
    // Server simulate is a node-platform `simulate` archive. nft must trace the
    // literal `import('<pkg>/dev')` into the sibling node_modules/ so the
    // extracted flow resolves it on disk. Confirms Fix B did not regress server.
    const archivePath = path.join(tmpDir, 'server-simulate.tar.gz');
    await bundle(serverFlow, {
      target: 'simulate',
      cache: false,
      silent: true,
      buildOverrides: { output: archivePath, minify: false },
    });

    expect(await fs.pathExists(archivePath)).toBe(true);

    const extractDir = path.join(tmpDir, 'extracted');
    await fs.ensureDir(extractDir);
    await tarExtract({ file: archivePath, cwd: extractDir });

    // The nft-traced sibling node_modules must contain the source package's
    // /dev module (its package.json + a dev entry).
    const devManifest = path.join(
      extractDir,
      'node_modules',
      ...SERVER_PKG.split('/'),
      'package.json',
    );
    expect(await fs.pathExists(devManifest)).toBe(true);

    // The /dev subpath module itself was traced into the archive. nft follows
    // the literal `import('<pkg>/dev')`, which resolves to `dist/dev.mjs` per the
    // package's `exports['./dev']`. Its presence proves the dev graph is on disk
    // for the extracted flow to resolve host-side (the server resolution model).
    const devSubpathModule = path.join(
      extractDir,
      'node_modules',
      ...SERVER_PKG.split('/'),
      'dist',
      'dev.mjs',
    );
    expect(await fs.pathExists(devSubpathModule)).toBe(true);
  }, 180000);
});
