/**
 * Task 7: jsdom smoke test for the CDN bundle.
 *
 * Ensures that the full two-stage cdn target produces a script that, when
 * evaluated in a jsdom browser-like environment:
 *   - exposes window.elb as a callable function
 *   - initializes window.elbLayer as an array
 *   - actually routes an event through the collector into the api destination
 *     (observed via a captured fetch call)
 *
 * The third assertion is the Bug 2 regression guard: before the env-injection
 * fix, the IIFE would load but pushes to elb/elbLayer would never reach the
 * api destination because the browser source never wired up `window`/`document`.
 */
import http from 'http';
import { readFile, mkdtemp, rm } from 'fs/promises';
import { ensureDir } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';
import type { Flow } from '@walkeros/core';

import { bundle } from '../../../commands/bundle/index.js';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { wrapSkeleton } from '../../../commands/bundle/wrap.js';
import { runBuildManifest } from '../../../commands/bundle/manifest.js';
import { VERSION } from '../../../version.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import { MINIMAL_FLOW } from '../../fixtures/minimal-flow.js';
import { withLocalPackages } from '../../helpers/local-packages.js';

/** The minimal flow bundled against this working tree. */
const LOCAL_FLOW = withLocalPackages(MINIMAL_FLOW);

/**
 * Internal minified function names that previously leaked onto `window` when
 * the served browser bundle ran as ESM at global scope. `ga` is the dangerous
 * one (it collides with the Google Analytics global and is invoked by consent
 * integrations); the rest are representative top-level declarations from the
 * minified collector/bundler graph. With an IIFE-wrapped bundle, none of these
 * may exist on `window`. `startFlow`/`wireConfig` are the skeleton's own
 * named functions and must also stay private.
 */
const LEAK_NAMES = ['ga', 'Oe', 'mn', 'bn', 'startFlow', 'wireConfig', 'U'];

/** The only globals the browser bundle is intended to add. */
const ALLOWED_GLOBALS = ['elb', 'elbLayer', 'walkerOS'];

/**
 * Run a browser bundle exactly as production does — via a classic `<script>`
 * tag at global scope — in a fresh jsdom window, then return the own-property
 * names the script ADDED to `window`. This faithfully reproduces the leak
 * vector: a top-level function/var declaration in a classic script attaches to
 * the global object, whereas `eval` of the same source does not, so `eval`
 * would under-reproduce the bug. jsdomErrors are swallowed via the
 * VirtualConsole; the assertions are on the global surface, not runtime errors.
 *
 * This uses its own `runScripts: 'dangerously'` JSDOM instance, scoped to the
 * leak tests, so it does not affect the file's existing smoke tests.
 */
async function runScriptAndDiffGlobals(code: string): Promise<{
  added: string[];
  read: (name: string) => unknown;
}> {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', () => {});

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'https://example.com/',
    virtualConsole,
  });

  const before = new Set(Object.getOwnPropertyNames(dom.window));
  const s = dom.window.document.createElement('script');
  s.textContent = code;
  dom.window.document.body.appendChild(s);

  // The intentional `window.*` assignments run inside the bundle's async IIFE,
  // after `await startFlow(...)`. Wait for it to settle before snapshotting.
  // The node global setTimeout flushes the macrotask queue just as well as the
  // jsdom one here; the bundle does not depend on the jsdom timer.
  await new Promise((r) => setTimeout(r, 100));
  const added = Object.getOwnPropertyNames(dom.window).filter(
    (n) => !before.has(n),
  );

  // Read arbitrary globals cast-free: Reflect.get returns `unknown`.
  const read = (name: string): unknown => Reflect.get(dom.window, name);

  dom.window.close();
  return { added, read };
}

interface FetchCall {
  url: string;
  body?: string;
}

interface LoadedBundle {
  dom: JSDOM;
  fetchCalls: FetchCall[];
}

describe('CDN bundle — jsdom smoke', () => {
  // The three smoke tests build the identical MINIMAL_FLOW cdn bundle with the
  // identical overrides, so the esbuild pipeline runs ONCE here and every test
  // loads the same script bytes into its own fresh jsdom window. Per-window
  // isolation is preserved (the routing test pushes through elb and mutates
  // its window), only the expensive build is shared.
  let tmpDir: string;
  let script: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-jsdom-'));
    const out = join(tmpDir, 'walker.js');
    await bundle(LOCAL_FLOW, {
      target: 'cdn',
      silent: true,
      buildOverrides: {
        output: out,
        windowCollector: 'walkerOS',
        windowElb: 'elb',
      },
    });
    script = await readFile(out, 'utf8');
  }, 120000);

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  // Load the shared bundle script into a fresh jsdom window with a captured
  // fetch. Each call returns an isolated window so tests never share state.
  async function loadBundle(): Promise<LoadedBundle> {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', () => {});

    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.com/',
      virtualConsole,
    });

    const fetchCalls: FetchCall[] = [];
    const windowAny = dom.window as unknown as {
      fetch: (url: unknown, init?: { body?: unknown }) => unknown;
      Response: new (body?: unknown, init?: unknown) => unknown;
      setTimeout: typeof setTimeout;
    };
    windowAny.fetch = (async (url: unknown, init?: { body?: unknown }) => {
      fetchCalls.push({
        url: String(url),
        body: init?.body != null ? String(init.body) : undefined,
      });
      return new windowAny.Response('{}', { status: 200 });
    }) as unknown as typeof windowAny.fetch;

    dom.window.eval(script);
    // Wait for async startFlow to resolve.
    await new Promise((r) => windowAny.setTimeout(r, 100));

    return { dom, fetchCalls };
  }

  it('sets window.elb as a function after load', async () => {
    const { dom } = await loadBundle();
    expect(typeof (dom.window as unknown as { elb: unknown }).elb).toBe(
      'function',
    );
    dom.window.close();
  });

  it('sets window.elbLayer as an array after load', async () => {
    const { dom } = await loadBundle();
    expect(
      Array.isArray((dom.window as unknown as { elbLayer: unknown }).elbLayer),
    ).toBe(true);
    dom.window.close();
  });

  // Bug 2 regression: previously elbLayer existed but nothing routed through
  // to destinations because the browser source had no env.window/env.document.
  it('elb("page view") reaches the api destination via elbLayer', async () => {
    const { dom, fetchCalls } = await loadBundle();
    const win = dom.window as unknown as {
      elb: (event: string, data?: Record<string, unknown>) => void;
      setTimeout: typeof setTimeout;
    };

    win.elb('page view', { title: 'Test' });
    await new Promise((r) => win.setTimeout(r, 50));

    expect(fetchCalls.length).toBeGreaterThan(0);
    const last = fetchCalls[fetchCalls.length - 1];
    expect(last.url).toContain('example.com/events');
    expect(last.body).toContain('page view');

    dom.window.close();
  });
});

/**
 * Global-scope leak guard.
 *
 * The served browser bundle must not leak its internal (minified) top-level
 * function declarations onto `window`. When the bundle ran as ESM served via a
 * classic `<script>`, its module body executed at global scope, so minified
 * names like `ga` (= fireCallbacks) collided with the real `window.ga` Google
 * Analytics global and crashed consent integrations. The fix emits the final
 * browser artifact as an IIFE so everything lives in a private closure; only
 * the intentional `window.elb` / `window.walkerOS` / `window.elbLayer`
 * assignments survive.
 *
 * Two paths produce a served browser bundle and both are guarded here:
 *   - cdn:  direct two-stage `target: 'cdn'` build (bundler.ts stage 2).
 *   - wrap: publish-time `wrapSkeleton({ platform: 'browser' })` over a
 *           `cdn-skeleton` build (wrap.ts). This is the path that built the
 *           deployed production bundle.
 */
describe('browser bundle — no global-scope leak', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-leak-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('cdn path adds only [elb, elbLayer, walkerOS] to window', async () => {
    const out = join(tmpDir, 'walker.js');
    // cache:false so this pure leak test never reads/writes the shared
    // `/tmp/cache/builds`: a warm cache could otherwise serve good IIFE bytes
    // over a regressed source (false green) or stale bytes over a correct one.
    await bundle(LOCAL_FLOW, {
      target: 'cdn',
      silent: true,
      cache: false,
      buildOverrides: {
        output: out,
        windowCollector: 'walkerOS',
        windowElb: 'elb',
      },
    });
    const script = await readFile(out, 'utf8');

    const { added, read } = await runScriptAndDiffGlobals(script);

    expect(added.sort()).toEqual([...ALLOWED_GLOBALS].sort());
    for (const name of LEAK_NAMES) {
      expect(read(name)).toBeUndefined();
    }
  }, 120000);

  it('wrap path adds only [elb, elbLayer, walkerOS] to window', async () => {
    // Build the cdn-skeleton (skipWrapper, withDev) then run the production
    // wrap over it — the exact path that built the deployed bundle.
    const skeletonPath = join(tmpDir, 'skeleton.mjs');
    const wrappedPath = join(tmpDir, 'wrapped.js');

    const logger = createCLILogger({ silent: true });
    const { flowSettings, buildOptions } = loadBundleConfig(LOCAL_FLOW, {
      configPath: join(tmpDir, 'flow.json'),
    });
    buildOptions.output = skeletonPath;
    buildOptions.platform = 'browser';
    buildOptions.format = 'esm';
    buildOptions.skipWrapper = true;
    buildOptions.withDev = true;
    buildOptions.externalizeDev = true;
    buildOptions.cache = false;

    await bundleCore(flowSettings, buildOptions, logger);

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath: wrappedPath,
      windowCollector: 'walkerOS',
      windowElb: 'elb',
    });

    const script = await readFile(wrappedPath, 'utf8');
    const { added, read } = await runScriptAndDiffGlobals(script);

    expect(added.sort()).toEqual([...ALLOWED_GLOBALS].sort());
    for (const name of LEAK_NAMES) {
      expect(read(name)).toBeUndefined();
    }
  }, 120000);

  it('cached cdn build serves the same no-leak IIFE bytes', async () => {
    // Isolated cache so this test owns the cache lifecycle: an uncached build,
    // then a cached read, must both be leak-free. Guards against a future
    // hardcode/cache-key regression silently serving stale ESM from cache.
    const cacheDir = join(tmpDir, 'cache-root');
    await ensureDir(cacheDir);

    async function buildCdn(cache: boolean): Promise<string> {
      const out = join(tmpDir, `walker.${cache ? 'cached' : 'fresh'}.js`);
      await bundle(LOCAL_FLOW, {
        target: 'cdn',
        silent: true,
        cache,
        buildOverrides: {
          output: out,
          windowCollector: 'walkerOS',
          windowElb: 'elb',
          tempDir: cacheDir,
        },
      });
      return readFile(out, 'utf8');
    }

    // 1. Uncached build: must be leak-free (and populates nothing).
    const fresh = await buildCdn(false);
    const freshResult = await runScriptAndDiffGlobals(fresh);
    expect(freshResult.added.sort()).toEqual([...ALLOWED_GLOBALS].sort());

    // 2. Cache-on build: writes the IIFE bytes into this test's own cache dir.
    await buildCdn(true);
    // 3. Second cache-on build: served from cache — must ALSO be leak-free.
    const cached = await buildCdn(true);
    const cachedResult = await runScriptAndDiffGlobals(cached);

    expect(cachedResult.added.sort()).toEqual([...ALLOWED_GLOBALS].sort());
    for (const name of LEAK_NAMES) {
      expect(cachedResult.read(name)).toBeUndefined();
    }
  }, 120000);
});

/**
 * window.elb comes from the browser source, not the bundle.
 *
 * The bundle no longer emits `window[windowElb] = elb`. The browser source is
 * the single writer of `window[settings.elb]`, so a web flow with NO browser
 * source exposes no `window.elb` — only the collector global the wrap still
 * assigns. This is the counterpart to the MINIMAL_FLOW smoke tests above, which
 * DO have a browser source and therefore still expose `window.elb`.
 */
describe('CDN bundle without a browser source — window.elb', () => {
  const BROWSERLESS_FLOW = withLocalPackages({
    version: 4,
    flows: {
      default: {
        config: { platform: 'web' },
        sources: {},
        destinations: {
          api: {
            package: '@walkeros/web-destination-api',
            config: {
              settings: {
                url: 'https://example.com/events',
                method: 'POST',
                transport: 'fetch',
              },
            },
          },
        },
      },
    },
  });

  let tmpDir: string;
  let script: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-nobrowser-'));
    const out = join(tmpDir, 'walker.js');
    await bundle(BROWSERLESS_FLOW, {
      target: 'cdn',
      silent: true,
      cache: false,
      buildOverrides: { output: out, windowCollector: 'walkerOS' },
    });
    script = await readFile(out, 'utf8');
  }, 120000);

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('leaves window.elb undefined; only the collector global is added', async () => {
    const { added, read } = await runScriptAndDiffGlobals(script);
    // No browser source ran, and the bundle no longer emits window.elb.
    expect(read('elb')).toBeUndefined();
    expect(added).not.toContain('elb');
    // The collector global is still emitted by the wrap.
    expect(added).toContain('walkerOS');
  }, 120000);
});

/**
 * The flow's `config.settings.windowCollector` names the one collector global,
 * whether the flow is built with `walkeros bundle` or from a build manifest.
 */
describe('CDN bundle — collector global from config.settings', () => {
  // A manifest build refuses local package paths, so the manifest case
  // builds the published packages; the `walkeros bundle` case this tree.
  const PUBLISHED_NAMED_FLOW: Flow.Json = {
    ...MINIMAL_FLOW,
    flows: {
      default: {
        ...MINIMAL_FLOW.flows.default,
        config: {
          platform: 'web',
          settings: { windowCollector: 'walkerCollector' },
        },
      },
    },
  };
  const NAMED_FLOW = withLocalPackages(PUBLISHED_NAMED_FLOW);
  const NAMED_GLOBALS = ['elb', 'elbLayer', 'walkerCollector'];

  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-named-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('walkeros bundle assigns only the named global', async () => {
    const out = join(tmpDir, 'walker.js');
    await bundle(NAMED_FLOW, {
      target: 'cdn',
      silent: true,
      cache: false,
      buildOverrides: { output: out },
    });
    const script = await readFile(out, 'utf8');
    const { added } = await runScriptAndDiffGlobals(script);
    expect(added.sort()).toEqual([...NAMED_GLOBALS].sort());
  }, 120000);

  it('a manifest cdn build assigns only the named global', async () => {
    const puts = new Map<string, Buffer>();
    let base = '';
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const url = (req.url ?? '/').split('?')[0];
        if (req.method === 'PUT') {
          puts.set(url, Buffer.concat(chunks));
          res.writeHead(200).end();
        } else if (url === '/manifest.json') {
          res.writeHead(200).end(
            JSON.stringify({
              version: 1,
              toolchain: VERSION,
              flowConfig: PUBLISHED_NAMED_FLOW,
              artifacts: [
                {
                  target: 'cdn',
                  outputName: 'walker.js',
                  putUrl: `${base}/out/walker.js`,
                },
              ],
              resultPutUrl: `${base}/result.json`,
            }),
          );
        } else {
          res.writeHead(404).end();
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    base = `http://127.0.0.1:${address.port}`;

    try {
      const { result } = await runBuildManifest(`${base}/manifest.json`);
      expect(result.error).toBeUndefined();
      expect(result.ok).toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    const script = puts.get('/out/walker.js')?.toString('utf8') ?? '';
    const { added } = await runScriptAndDiffGlobals(script);
    expect(added.sort()).toEqual([...NAMED_GLOBALS].sort());
  }, 180000);
});

/**
 * The observe recorder ships only in an observed wrap. With the same
 * `elbObserve` credential in storage, an observed wrap attaches and posts its
 * FlowState records, with the recorded vendor calls at trace level, to the
 * observer's `/ingest`; a plain wrap has no recorder, so nothing posts.
 */
describe('observe wrap — jsdom', () => {
  const OBSERVE = {
    url: 'https://obs.example',
    binding: 'pb_x',
    level: 'trace',
  } as const;
  const CREDENTIAL = 'obsw_pb_x.ses_1.secret';

  const GTAG_FLOW = withLocalPackages({
    version: 4,
    flows: {
      default: {
        config: { platform: 'web' },
        sources: MINIMAL_FLOW.flows.default.sources,
        destinations: {
          gtag: {
            package: '@walkeros/web-destination-gtag',
            config: {
              loadScript: false,
              settings: { ga4: { measurementId: 'G-TEST' } },
            },
          },
        },
      },
    },
  });

  let tmpDir: string;
  let plain: string;
  let observed: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'walkeros-observe-'));
    const skeletonPath = join(tmpDir, 'skeleton.mjs');
    await bundle(GTAG_FLOW, {
      target: 'cdn-skeleton',
      silent: true,
      cache: false,
      buildOverrides: { output: skeletonPath },
    });
    const wrap = async (name: string, observe?: typeof OBSERVE) => {
      const outputPath = join(tmpDir, name);
      await wrapSkeleton({
        skeletonPath,
        platform: 'browser',
        outputPath,
        ...(observe ? { observe } : {}),
      });
      return readFile(outputPath, 'utf8');
    };
    plain = await wrap('plain.js');
    observed = await wrap('observed.js', OBSERVE);
  }, 120000);

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  /** Boot a wrap with the credential in storage, push one event, collect fetches. */
  async function requests(script: string): Promise<FetchCall[]> {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', () => {});
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://example.com/',
      virtualConsole,
    });
    dom.window.localStorage.setItem('elbObserve', CREDENTIAL);

    const fetchCalls: FetchCall[] = [];
    const stub = async (url: unknown, init?: { body?: unknown }) => {
      fetchCalls.push({
        url: String(url),
        body: init?.body != null ? String(init.body) : undefined,
      });
      return { ok: true, status: 200 };
    };
    Reflect.set(dom.window, 'fetch', stub);

    dom.window.eval(script);
    await new Promise((r) => setTimeout(r, 100));
    const elb = Reflect.get(dom.window, 'elb');
    expect(typeof elb).toBe('function');
    await elb('page view', { title: 'Test' });
    // The observe poster flushes its batch after 50 ms.
    await new Promise((r) => setTimeout(r, 200));
    dom.window.close();
    return fetchCalls;
  }

  it('an observed wrap posts its records with the vendor calls to /ingest', async () => {
    const posts = (await requests(observed)).filter((call) =>
      call.url.startsWith('https://obs.example/ingest/ses_1'),
    );
    expect(posts.length).toBeGreaterThan(0);
    const bodies = posts.map((call) => call.body ?? '').join('\n');
    expect(bodies).toContain('"calls"');
    expect(bodies).toContain('window.gtag');
  });

  it('a plain wrap with the same credential makes no request', async () => {
    expect(await requests(plain)).toEqual([]);
  });
});
