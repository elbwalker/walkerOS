import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import {
  wrapSkeleton,
  extractDevExternals,
  observeProblem,
} from '../../../commands/bundle/wrap.js';
import { generateWrapEntry } from '../../../commands/bundle/bundler.js';

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

  it('a plain browser wrap merges no hooks into its config', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');
    expect(output).not.toContain('config.hooks');
  });

  it('a wrap without preview bakes no activator', async () => {
    const skeletonPath = await writeFakeSkeleton();
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrapSkeleton({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
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
    // The call keeps its literals; the minified web-core renames `moin`.
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
describe('wrapSkeleton core resolution', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrap-shadow-test-'));
    // An older core and web-core above the wrap's temp dir, as a shared /tmp
    // can hold them.
    for (const name of ['core', 'web-core']) {
      const shadow = path.join(tmpDir, 'node_modules', '@walkeros', name);
      await fs.outputJson(path.join(shadow, 'package.json'), {
        name: `@walkeros/${name}`,
        version: '0.0.1',
        type: 'module',
        exports: { '.': './index.mjs' },
      });
      await fs.writeFile(
        path.join(shadow, 'index.mjs'),
        'export const shadowCore = true;\n',
      );
    }
    // The CLI's temp root is read once at load: reload it under tmpDir.
    jest
      .spyOn(jest.requireActual<typeof os>('os'), 'tmpdir')
      .mockReturnValue(tmpDir);
    jest.resetModules();
  });

  afterEach(async () => {
    await fs.remove(tmpDir).catch(() => {});
  });

  it('imports the loader from the CLI web-core, never from a copy above its temp dir', async () => {
    const { wrapSkeleton: wrap } =
      await import('../../../commands/bundle/wrap.js');
    const skeletonPath = path.join(tmpDir, 'skeleton.mjs');
    await fs.writeFile(
      skeletonPath,
      `export function wireConfig(d) { return d; }
export function startFlow(c) { return Promise.resolve({ collector: { config: c }, elb() {} }); }
export const __configData = {};
`,
    );
    const outputPath = path.join(tmpDir, 'walker.js');

    await wrap({
      skeletonPath,
      platform: 'browser',
      outputPath,
      minify: false,
    });

    const output = await fs.readFile(outputPath, 'utf-8');
    expect(output).toContain('walkeros.moin');
    expect(output).not.toContain('shadowCore');
  });
});

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

  it('an older skeleton without needs wraps with every flag on but the reporter', async () => {
    const output = await wrapText({ skeletonPath: await flagSkeleton() });
    expect(output).toContain('observe: false');
    expect(output).toContain('stores: true');
    expect(output).toContain('state: true');
    expect(output).toContain('validate: true');
  });

  const OBSERVING =
    '/* walkeros:needs {"observe":true,"stores":false,"state":false} */';
  const PREVIEW = {
    url: 'https://ingest.example.com/preview',
    token: 'wos_preview_t1_secret',
  };

  it.each([
    ['needs that say observe', OBSERVING],
    ['no needs', ''],
  ])(
    'a wrap without observe carries no reporter, for a skeleton with %s',
    async (_, marker) => {
      const output = await wrapText({
        skeletonPath: await flagSkeleton(marker),
      });
      expect(output).toContain('observe: false');
    },
  );

  it.each([
    ['lean needs', LEAN],
    ['no needs', ''],
  ])(
    'a wrap given observe carries the reporter, for a skeleton with %s',
    async (_, marker) => {
      const output = await wrapText({
        skeletonPath: await flagSkeleton(marker),
        observe: { preview: PREVIEW },
      });
      expect(output).toContain('observe: true');
    },
  );

  it('a node wrap defines no flags', async () => {
    const output = await wrapText({
      skeletonPath: await flagSkeleton(LEAN),
      platform: 'node',
    });
    expect(output).toContain('__WALKEROS_OBSERVE__');
  });
});

describe('observeProblem', () => {
  const PREVIEW = {
    url: 'https://ingest.example.com/preview',
    token: 'wos_preview_t1_secret',
  };
  const BROWSER = { platform: 'browser' as const, preview: false };

  it.each<
    [
      string,
      unknown,
      typeof BROWSER | { platform: 'node'; preview: boolean },
      RegExp,
    ]
  >([
    [
      'usage',
      { preview: PREVIEW, usage: PREVIEW },
      BROWSER,
      /^Invalid observe: .*"usage"/,
    ],
    ['not an object', 'preview', BROWSER, /^Invalid observe: /],
    ['no preview', {}, BROWSER, /^Invalid observe\.preview: /],
    [
      'an unknown preview key',
      { preview: { ...PREVIEW, interval: 60 } },
      BROWSER,
      /^Invalid observe\.preview: .*"interval"/,
    ],
    [
      'a url that is not http',
      { preview: { ...PREVIEW, url: 'ftp://x/p' } },
      BROWSER,
      /^Invalid observe\.preview\.url: /,
    ],
    [
      'a reference',
      { preview: { ...PREVIEW, url: '$env.OBSERVE_URL' } },
      BROWSER,
      /^Invalid observe\.preview\.url: /,
    ],
    [
      'an empty token',
      { preview: { ...PREVIEW, token: '' } },
      BROWSER,
      /^Invalid observe\.preview\.token: /,
    ],
    [
      'a node wrap',
      { preview: PREVIEW },
      { platform: 'node', preview: false },
      /^observe is a browser wrap option$/,
    ],
    [
      'preview activation beside it',
      { preview: PREVIEW },
      { platform: 'browser', preview: true },
      /^observe is refused beside preview, which makes a host build$/,
    ],
  ])(
    'refuses observe with %s, naming keys only',
    (_, observe, wrap, message) => {
      const problem = observeProblem(observe, wrap);
      expect(problem).toMatch(message);
      expect(problem).not.toContain(PREVIEW.token);
    },
  );

  it('accepts the preview route and its token', () => {
    expect(observeProblem({ preview: PREVIEW }, BROWSER)).toBeUndefined();
  });

  it('makes wrapSkeleton throw before any build', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrap-observe-test-'));
    try {
      await expect(
        wrapSkeleton({
          skeletonPath: path.join(dir, 'missing.mjs'),
          platform: 'node',
          outputPath: path.join(dir, 'flow.mjs'),
          observe: { preview: PREVIEW },
        }),
      ).rejects.toThrow('observe is a browser wrap option');
    } finally {
      await fs.remove(dir);
    }
  });
});

describe('generateWrapEntry observe', () => {
  const PREVIEW = {
    url: 'https://ingest.example.com/preview',
    token: 'wos_preview_t1_secret',
  };

  it("replaces the flow's own observe block with the wrap's, after the config is wired and before the flow starts", () => {
    const entry = generateWrapEntry('/tmp/skeleton.mjs', {
      observe: { preview: PREVIEW },
    });
    const wired = entry.indexOf('wireConfig(__configData)');
    const baked = entry.indexOf(
      `config.observe = ${JSON.stringify({ preview: PREVIEW })};`,
    );
    const started = entry.indexOf('await startFlow(config)');
    expect(wired).toBeGreaterThan(-1);
    expect(baked).toBeGreaterThan(wired);
    expect(started).toBeGreaterThan(baked);
  });

  it('bakes only the preview url and token', () => {
    // A value with more keys than the type names, as an untyped caller has.
    const observe = { preview: { ...PREVIEW, extra: 'x' }, usage: PREVIEW };
    const entry = generateWrapEntry('/tmp/skeleton.mjs', { observe });
    expect(entry).toContain(
      `config.observe = ${JSON.stringify({ preview: PREVIEW })};`,
    );
    expect(entry).not.toContain('usage');
    expect(entry).not.toContain('extra');
  });

  it('without observe leaves the config as wired', () => {
    expect(generateWrapEntry('/tmp/skeleton.mjs')).not.toContain(
      'config.observe',
    );
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
