import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import {
  serializeWithCode,
  validateComponentNames,
  collectAllStepPackages,
  applyStepPackages,
  buildSplitConfigObject,
  generateServerEntry,
  generateWebEntry,
  generateWrapEntry,
  generateWrapEntryServer,
  bundleCore,
  generateCacheKeyContent,
} from '../bundler';
import { cacheBuild, getBuildCachePath } from '../../../core/build-cache.js';
import { tmpRunDir } from '../../../core/tmp-names.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { BuildOptions } from '../../../types/bundle.js';
import type { Flow, Logger } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';

// Partial mocks: keep real implementations as default delegates so other
// suites in this file (which don't import these mocked symbols) are
// unaffected. The server-nft suite below overrides via mockImplementation.
jest.mock('../nft-trace', () => {
  const actual = jest.requireActual('../nft-trace');
  return {
    ...actual,
    traceAndCopy: jest.fn(actual.traceAndCopy),
  };
});
jest.mock('../../../core/package-manager.js', () => {
  const actual = jest.requireActual('../../../core/package-manager.js');
  return {
    ...actual,
    downloadPackagesWithResolution: jest.fn(
      actual.downloadPackagesWithResolution,
    ),
  };
});
jest.mock('../../../core/build-cache.js', () => {
  const actual = jest.requireActual('../../../core/build-cache.js');
  return {
    ...actual,
    cacheBuild: jest.fn(actual.cacheBuild),
    getCachedBuild: jest.fn(actual.getCachedBuild),
  };
});

jest.mock('../../../core/tmp-names.js', () => {
  const actual = jest.requireActual('../../../core/tmp-names.js');
  return { ...actual, tmpRunDir: jest.fn(actual.tmpRunDir) };
});

import { traceAndCopy } from '../nft-trace';
import { downloadPackagesWithResolution } from '../../../core/package-manager.js';
import { getCachedBuild } from '../../../core/build-cache.js';

const mockTraceAndCopy = traceAndCopy as jest.MockedFunction<
  typeof traceAndCopy
>;
const mockDownloadWithResolution =
  downloadPackagesWithResolution as jest.MockedFunction<
    typeof downloadPackagesWithResolution
  >;
const mockCacheBuild = cacheBuild as jest.MockedFunction<typeof cacheBuild>;
const mockGetCachedBuild = getCachedBuild as jest.MockedFunction<
  typeof getCachedBuild
>;

describe('serializeWithCode __WALKEROS_ENV marker', () => {
  it('emits process.env expression for marker-only string', () => {
    expect(serializeWithCode('__WALKEROS_ENV:API_KEY', 0)).toBe(
      'process.env["API_KEY"]',
    );
  });

  it('emits process.env with fallback for marker with default', () => {
    expect(serializeWithCode('__WALKEROS_ENV:HOST:localhost', 0)).toBe(
      'process.env["HOST"] ?? "localhost"',
    );
  });

  it('handles URL default value with embedded colons', () => {
    expect(
      serializeWithCode('__WALKEROS_ENV:REDIS_URL:redis://localhost:6379', 0),
    ).toBe('process.env["REDIS_URL"] ?? "redis://localhost:6379"');
  });

  it('emits template literal for mixed content', () => {
    expect(serializeWithCode('https://__WALKEROS_ENV:HOST/api', 0)).toBe(
      '`https://${process.env["HOST"]}/api`',
    );
  });

  it('handles multiple markers in one string', () => {
    // PROTO captures `//` as default (chars before next marker are part of default)
    expect(
      serializeWithCode('__WALKEROS_ENV:PROTO://__WALKEROS_ENV:HOST/path', 0),
    ).toBe('`${process.env["PROTO"] ?? "//"}${process.env["HOST"]}/path`');
  });

  it('handles marker embedded in longer string with default', () => {
    // Default extends to end of string (no next marker to stop at)
    expect(serializeWithCode('prefix-__WALKEROS_ENV:PORT:8080-suffix', 0)).toBe(
      '`prefix-${process.env["PORT"] ?? "8080-suffix"}`',
    );
  });

  it('escapes dollar signs in static parts of template literals', () => {
    expect(serializeWithCode('Price is $5 for __WALKEROS_ENV:ITEM', 0)).toBe(
      '`Price is \\$5 for ${process.env["ITEM"]}`',
    );
  });

  it('escapes backticks in static parts of template literals', () => {
    expect(serializeWithCode('say `hello` to __WALKEROS_ENV:NAME', 0)).toBe(
      '`say \\`hello\\` to ${process.env["NAME"]}`',
    );
  });

  it('does not consume next marker as default value', () => {
    // `-` before next marker is captured as part of A's default
    expect(
      serializeWithCode('__WALKEROS_ENV:A:fallback-__WALKEROS_ENV:B', 0),
    ).toBe('`${process.env["A"] ?? "fallback-"}${process.env["B"]}`');
  });

  it('still handles $code: prefix', () => {
    expect(serializeWithCode('$code:myFunction()', 0)).toBe('myFunction()');
  });

  it('still handles plain strings', () => {
    expect(serializeWithCode('hello', 0)).toBe('"hello"');
  });
});

describe('serializeWithCode __WALKEROS_SECRET marker', () => {
  it('emits a guarded process.env read for a pure secret marker', () => {
    expect(serializeWithCode('__WALKEROS_SECRET:GCP_SERVICE_ACCOUNT', 0)).toBe(
      '__walkerosRequireSecret("GCP_SERVICE_ACCOUNT", process.env["GCP_SERVICE_ACCOUNT"])',
    );
  });

  it('never bakes the marker string literally into the data payload', () => {
    const result = serializeWithCode(
      '__WALKEROS_SECRET:GCP_SERVICE_ACCOUNT',
      0,
    );
    expect(result).not.toBe('"__WALKEROS_SECRET:GCP_SERVICE_ACCOUNT"');
    expect(result).not.toContain('__WALKEROS_SECRET:');
  });

  it('reads through process.env and never inlines a value', () => {
    const result = serializeWithCode(
      '__WALKEROS_SECRET:GCP_SERVICE_ACCOUNT',
      0,
    );
    expect(result).toContain('process.env["GCP_SERVICE_ACCOUNT"]');
    expect(result).toContain('__walkerosRequireSecret');
  });
});

describe('validateComponentNames', () => {
  it('should accept valid camelCase names', () => {
    expect(() =>
      validateComponentNames(
        {
          cache: {},
          router: {},
          gtagWrapper: {},
        },
        'transformers',
      ),
    ).not.toThrow();
  });

  it('should reject names with hyphens', () => {
    expect(() =>
      validateComponentNames(
        {
          'gtag-wrapper': {},
        },
        'transformers',
      ),
    ).toThrow(/gtag-wrapper.*valid JavaScript identifier/);
  });

  it('should reject names starting with numbers', () => {
    expect(() =>
      validateComponentNames(
        {
          '123abc': {},
        },
        'sources',
      ),
    ).toThrow(/123abc.*valid JavaScript identifier/);
  });

  it('should suggest camelCase alternative for hyphenated names', () => {
    expect(() =>
      validateComponentNames(
        {
          'my-cool-source': {},
        },
        'sources',
      ),
    ).toThrow(/myCoolSource/);
  });
});

describe('collectAllStepPackages', () => {
  it('returns empty set for flow with no steps', () => {
    const settings = {} as Flow;
    expect(collectAllStepPackages(settings)).toEqual(new Set());
  });

  it('collects source packages', () => {
    const settings = {
      sources: {
        http: { package: '@walkeros/server-source-express' },
      },
    } as unknown as Flow;
    expect(collectAllStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-source-express']),
    );
  });

  it('collects destination packages', () => {
    const settings = {
      destinations: {
        bigquery: { package: '@walkeros/server-destination-bigquery' },
      },
    } as unknown as Flow;
    expect(collectAllStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-destination-bigquery']),
    );
  });

  it('collects transformer packages', () => {
    const settings = {
      transformers: {
        fingerprint: { package: '@walkeros/server-transformer-fingerprint' },
      },
    } as unknown as Flow;
    expect(collectAllStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-transformer-fingerprint']),
    );
  });

  it('collects store packages', () => {
    const settings = {
      stores: {
        fs: { package: '@walkeros/server-store-fs' },
      },
    } as unknown as Flow;
    expect(collectAllStepPackages(settings)).toEqual(
      new Set(['@walkeros/server-store-fs']),
    );
  });

  it('collects from all step types combined', () => {
    const settings = {
      sources: { http: { package: '@walkeros/server-source-express' } },
      destinations: {
        bq: { package: '@walkeros/server-destination-bigquery' },
      },
      transformers: {
        fingerprint: { package: '@walkeros/server-transformer-fingerprint' },
      },
      stores: { fs: { package: '@walkeros/server-store-fs' } },
    } as unknown as Flow;
    const result = collectAllStepPackages(settings);
    expect(result.size).toBe(4);
    expect(result.has('@walkeros/server-source-express')).toBe(true);
    expect(result.has('@walkeros/server-destination-bigquery')).toBe(true);
    expect(result.has('@walkeros/server-transformer-fingerprint')).toBe(true);
    expect(result.has('@walkeros/server-store-fs')).toBe(true);
  });

  it('skips steps with inline code instead of package', () => {
    const settings = {
      sources: {
        custom: { code: { push: 'myPush()' } },
      },
    } as unknown as Flow;
    expect(collectAllStepPackages(settings)).toEqual(new Set());
  });

  it('includes local paths (starting with . or /)', () => {
    const settings = {
      sources: {
        local1: { package: './relative/source' },
        local2: { package: '/abs/path/source' },
      },
    } as unknown as Flow;
    const result = collectAllStepPackages(settings);
    expect(result.has('./relative/source')).toBe(true);
    expect(result.has('/abs/path/source')).toBe(true);
  });

  it('includes scoped npm packages (starting with @)', () => {
    const settings = {
      sources: {
        s: { package: '@walkeros/server-source-express' },
      },
    } as unknown as Flow;
    const result = collectAllStepPackages(settings);
    expect(result.has('@walkeros/server-source-express')).toBe(true);
  });

  it('includes unscoped npm packages', () => {
    const settings = {
      destinations: {
        d: { package: 'some-destination' },
      },
    } as unknown as Flow;
    const result = collectAllStepPackages(settings);
    expect(result.has('some-destination')).toBe(true);
  });

  it('deduplicates same package used in multiple steps', () => {
    const settings = {
      sources: { s1: { package: '@walkeros/core' } },
      destinations: { d1: { package: '@walkeros/core' } },
    } as unknown as Flow;
    const result = collectAllStepPackages(settings);
    expect(result.size).toBe(1);
  });
});

describe('applyStepPackages', () => {
  const testLogger = createMockLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const flowWith = (pkg: string) =>
    ({
      sources: { browser: { package: pkg } },
      destinations: {},
      transformers: {},
      stores: {},
    }) as unknown as Flow;

  it('splits an inline version into the packages map and rewrites the step', () => {
    const flow = flowWith(
      '@walkeros/web-source-browser@4.3.0-next-1783517345197',
    );
    const packages: BuildOptions['packages'] = {};
    applyStepPackages(flow, packages, testLogger);
    expect(packages['@walkeros/web-source-browser']).toEqual({
      version: '4.3.0-next-1783517345197',
    });
    expect(flow.sources?.browser?.package).toBe('@walkeros/web-source-browser');
  });

  it('lets an explicit bundle pin win and warns on disagreement', () => {
    const flow = flowWith('@walkeros/web-source-browser@2.0.0');
    const packages: BuildOptions['packages'] = {
      '@walkeros/web-source-browser': { version: '1.0.0' },
    };
    applyStepPackages(flow, packages, testLogger);
    expect(packages['@walkeros/web-source-browser']).toEqual({
      version: '1.0.0',
    });
    expect(testLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('@walkeros/web-source-browser'),
    );
  });

  it('fills an unversioned bundle entry and preserves its fields', () => {
    const flow = flowWith('@walkeros/collector@3.1.0');
    const packages: BuildOptions['packages'] = {
      '@walkeros/collector': { imports: ['startFlow'] },
    };
    applyStepPackages(flow, packages, testLogger);
    expect(packages['@walkeros/collector']).toEqual({
      imports: ['startFlow'],
      version: '3.1.0',
    });
  });

  it('throws when two steps pin the same package to different inline versions', () => {
    const flow = {
      sources: { a: { package: '@walkeros/collector@1.0.0' } },
      destinations: { b: { package: '@walkeros/collector@2.0.0' } },
      transformers: {},
      stores: {},
    } as unknown as Flow;
    expect(() => applyStepPackages(flow, {}, testLogger)).toThrow(
      /Conflicting inline versions for @walkeros\/collector/,
    );
  });

  it('keeps bare names untouched (no version, no rewrite)', () => {
    const flow = flowWith('@walkeros/web-source-browser');
    const packages: BuildOptions['packages'] = {};
    applyStepPackages(flow, packages, testLogger);
    expect(packages['@walkeros/web-source-browser']).toEqual({});
    expect(flow.sources?.browser?.package).toBe('@walkeros/web-source-browser');
  });
});

describe('buildSplitConfigObject named-import references', () => {
  it('accepts a destination with package + import (named import)', () => {
    const flowSettings = {
      destinations: {
        ga4: {
          package: '@walkeros/web-destination-ga4',
          import: 'destinationGa4Web',
          config: {},
        },
      },
    } as unknown as Flow;

    expect(() => buildSplitConfigObject(flowSettings, new Map())).not.toThrow();
  });

  it('accepts a source with package + import (named import)', () => {
    const flowSettings = {
      sources: {
        cmp: {
          package: '@walkeros/web-source-cmp',
          import: 'sourceCmpCustom',
          config: {},
        },
      },
    } as unknown as Flow;

    expect(() => buildSplitConfigObject(flowSettings, new Map())).not.toThrow();
  });

  it('accepts a transformer with package + import (named import)', () => {
    const flowSettings = {
      transformers: {
        decoder: {
          package: '@walkeros/transformer-base64',
          import: 'transformerBase64Decoder',
          config: {},
        },
      },
    } as unknown as Flow;

    expect(() => buildSplitConfigObject(flowSettings, new Map())).not.toThrow();
  });

  it('emits before chain for inline transformers', () => {
    const flow = {
      sources: {
        input: { package: '@walkeros/server-source-express', config: {} },
      },
      destinations: {
        out: {
          package: '@walkeros/destination-demo',
          config: { before: ['orchestrator'] },
        },
      },
      transformers: {
        noop: {
          code: { type: 'noop', push: '$code:(event) => event' },
          // Inline transformers may have a `before` chain just like file-based ones.
          before: ['stepA', 'stepB'],
        },
      },
      stores: {},
    } as unknown as Flow;

    const { codeConfigObject } = buildSplitConfigObject(flow, new Map());

    // The emitted transformer entry must contain a `before:` clause naming the chain.
    expect(codeConfigObject).toMatch(
      /noop:\s*\{.*?before:\s*\[\s*"stepA"\s*,\s*"stepB"\s*\]/s,
    );
  });

  it('resolves $store.X in inline transformer env', () => {
    const flow = {
      sources: {
        input: { package: '@walkeros/server-source-express', config: {} },
      },
      destinations: {
        out: { package: '@walkeros/destination-demo', config: {} },
      },
      transformers: {
        stash: {
          code: {
            type: 'stash',
            push: '$code:async (event, context) => { /* writes via context.env.store */ }',
          },
          env: { store: '$store.cache' },
        },
      },
      stores: {
        cache: { package: '@walkeros/server-store-fs' },
      },
    } as unknown as Flow;

    const { codeConfigObject } = buildSplitConfigObject(flow, new Map());

    // Marker must resolve to a JS reference, not a literal string.
    expect(codeConfigObject).toMatch(
      /stash:\s*\{[\s\S]*?env:\s*\{\s*"store":\s*stores\.cache\s*\}/,
    );
    expect(codeConfigObject).not.toContain('"$store.cache"');
  });

  it('inline transformer with env markers and before chain emits both correctly', () => {
    const flow = {
      sources: {
        input: { package: '@walkeros/server-source-express', config: {} },
      },
      destinations: {
        out: {
          package: '@walkeros/destination-demo',
          config: { before: ['orchestrate'] },
        },
      },
      transformers: {
        orchestrate: {
          code: { type: 'orchestrate', push: '$code:(event) => event' },
          before: ['filterDup'],
        },
        filterDup: {
          code: {
            type: 'filter-dup',
            push: '$code:async (event, context) => { if (await context.env.store.get(event.id)) return false; await context.env.store.set(event.id, 1); }',
          },
          env: { store: '$store.cache' },
        },
      },
      stores: {
        cache: { package: '@walkeros/server-store-fs' },
      },
    } as unknown as Flow;

    const { codeConfigObject } = buildSplitConfigObject(flow, new Map());

    // Bug 2 fix: orchestrate's before chain is emitted.
    expect(codeConfigObject).toMatch(
      /orchestrate:\s*\{[\s\S]*?before:\s*\[\s*"filterDup"\s*\]/s,
    );

    // Bug 1 fix: filterDup's env marker resolves to a stores.* JS reference.
    expect(codeConfigObject).toMatch(
      /filterDup:\s*\{[\s\S]*?env:\s*\{[\s\S]*?"store":\s*stores\.cache/s,
    );

    // No literal $store.cache string anywhere in the emission.
    expect(codeConfigObject).not.toContain('"$store.cache"');
  });
});

describe('collectAllStepPackages auto-add merge logic', () => {
  it('adds source package to buildOptions.packages when not present', () => {
    const flowSettings = {
      sources: { http: { package: '@walkeros/server-source-express' } },
    } as unknown as Flow;

    const packages: Record<string, Record<string, unknown>> = {};

    const stepPkgs = collectAllStepPackages(flowSettings);
    for (const pkg of stepPkgs) {
      if (!packages[pkg]) {
        packages[pkg] = {};
      }
    }

    expect(packages['@walkeros/server-source-express']).toEqual({});
  });

  it('does not overwrite existing package config', () => {
    const flowSettings = {
      sources: { http: { package: '@walkeros/server-source-express' } },
    } as unknown as Flow;

    const packages: Record<string, Record<string, unknown>> = {
      '@walkeros/server-source-express': { version: '2.0.0' },
    };

    const stepPkgs = collectAllStepPackages(flowSettings);
    for (const pkg of stepPkgs) {
      if (!packages[pkg]) {
        packages[pkg] = {};
      }
    }

    expect(packages['@walkeros/server-source-express']).toEqual({
      version: '2.0.0',
    });
  });
});

describe('path-based package: normalization', () => {
  it('should handle absolute path in source package: field', () => {
    const flowSettings = {
      sources: {
        express: { package: '/workspaces/dev/packages/server/sources/express' },
      },
    } as unknown as Flow;

    const result = collectAllStepPackages(flowSettings);
    expect(result.has('/workspaces/dev/packages/server/sources/express')).toBe(
      true,
    );
  });

  it('should handle relative path in source package: field', () => {
    const flowSettings = {
      sources: {
        express: { package: './packages/server/sources/express' },
      },
    } as unknown as Flow;

    const result = collectAllStepPackages(flowSettings);
    expect(result.has('./packages/server/sources/express')).toBe(true);
  });
});

describe('stage 2 entry path normalization (issue #636)', () => {
  const winPath = ['C:', 'tmp', 'cache', 'code', 'abc.mjs'].join(
    String.fromCharCode(92),
  );
  const cases = [
    {
      name: 'generateServerEntry',
      emit: () => generateServerEntry(winPath, '{}'),
    },
    { name: 'generateWebEntry', emit: () => generateWebEntry(winPath, '{}') },
    { name: 'generateWrapEntry', emit: () => generateWrapEntry(winPath) },
    {
      name: 'generateWrapEntryServer',
      emit: () => generateWrapEntryServer(winPath),
    },
  ];

  for (const { name, emit } of cases) {
    it(`${name} emits no backslashes in the import specifier`, () => {
      expect(emit()).toContain("from 'C:/tmp/cache/code/abc.mjs'");
    });
  }
});

/**
 * Phase 2 nft wiring: when the resolved platform is `node` (server flows),
 * bundleCore must run the new nft path after esbuild instead of the legacy
 * `installExternalsViaPacote` + `writeBundleLockfile` pipeline. The legacy
 * path stays alive for non-server platforms until Phase 3 deletes it.
 *
 * These suites pre-seed the L1 build cache so the bundler takes the
 * cache-hit fast path. That keeps the test off real esbuild + real nft and
 * lets us assert exactly which post-build pipeline ran.
 */
describe('bundleCore server nft wiring (Phase 2)', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-nft-'));

    // Default: download/trace mocks return empty/successful results.
    // Specific tests override as needed.
    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map(),
      resolution: { topLevel: new Map(), nested: [] },
    });
    mockTraceAndCopy.mockResolvedValue({
      fileList: [],
      copied: 0,
      reasons: new Map(),
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(tmp);
  });

  /**
   * Pre-seeds the L1 cache with bundle text for a fixed (flow, options) pair,
   * keyed by the bundler's own `generateCacheKeyContent`. The bundler
   * hashes pacote's resolved top-level package set as `versionsHash`. Tests
   * mock `downloadPackagesWithResolution` to return an empty topLevel, so
   * the runtime versionsHash is the sha256 of the empty string truncated
   * to 12 chars.
   *
   * The bundler auto-mutates `buildOptions.packages` early in `bundleCore`
   * (adds `@walkeros/collector` and step packages from the flow). Mirror that
   * mutation here so the seeded cache key matches the runtime cache key.
   */
  async function seedCachedServerBuild(opts: {
    outputPath: string;
    cacheDir: string;
    flowSettings: Flow;
    bundleText?: string;
    versionsHash?: string;
    extraPackages?: Record<string, Flow.BundlePackage>;
    include?: string[];
  }): Promise<BuildOptions> {
    const packages: Record<string, Flow.BundlePackage> = {
      ...opts.extraPackages,
    };
    const hasSourcesOrDests =
      Object.keys(opts.flowSettings.sources ?? {}).length > 0 ||
      Object.keys(opts.flowSettings.destinations ?? {}).length > 0;
    if (hasSourcesOrDests) {
      packages['@walkeros/collector'] = {};
    }
    for (const pkg of collectAllStepPackages(opts.flowSettings)) {
      if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
        packages[pkg] = {};
      }
    }

    const buildOptions: BuildOptions = {
      output: opts.outputPath,
      tempDir: opts.cacheDir,
      cache: true,
      packages,
      format: 'esm',
      platform: 'node',
      configDir: tmp,
      ...(opts.include ? { include: opts.include } : {}),
    };
    const versionsHash = opts.versionsHash ?? (await getHashServer('', 12));
    await cacheBuild(
      generateCacheKeyContent(opts.flowSettings, buildOptions, versionsHash),
      opts.bundleText ?? '// cached server bundle\n',
      opts.cacheDir,
    );
    return buildOptions;
  }

  it('server platform routes the post-build step to traceAndCopy', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    const flowSettings: Flow = {
      config: { platform: 'server' },
      sources: {
        http: { package: '@walkeros/server-source-express' },
      },
      destinations: {
        console: { package: '@walkeros/server-destination-console' },
      },
    };

    const buildOptions = await seedCachedServerBuild({
      outputPath,
      cacheDir,
      flowSettings,
    });

    // The cross-check asserts every declared step package was traced. The
    // bundler auto-adds @walkeros/collector when sources/destinations exist,
    // so include all three in the mocked fileList.
    mockTraceAndCopy.mockResolvedValue({
      fileList: [
        'node_modules/@walkeros/collector/package.json',
        'node_modules/@walkeros/server-source-express/package.json',
        'node_modules/@walkeros/server-destination-console/package.json',
      ],
      copied: 3,
      reasons: new Map(),
    });

    await bundleCore(flowSettings, buildOptions, logger);

    expect(mockTraceAndCopy).toHaveBeenCalledTimes(1);

    // Informational sidecar package.json is written next to the bundle. It
    // lists the step packages from the flow with `*` versions; the
    // user-facing `npm install` is the source of truth for actual versions.
    const sidecarPath = path.join(outputDir, 'package.json');
    expect(await fs.pathExists(sidecarPath)).toBe(true);
    const sidecar = await fs.readJson(sidecarPath);
    expect(sidecar.name).toBe('walkeros-bundle');
    expect(sidecar.private).toBe(true);
    expect(sidecar.type).toBe('module');
    expect(sidecar.dependencies).toEqual({
      '@walkeros/server-destination-console': '*',
      '@walkeros/server-source-express': '*',
    });

    // The legacy lockfile must NOT be written by the new path.
    expect(await fs.pathExists(path.join(outputDir, 'package-lock.json'))).toBe(
      false,
    );
  });

  it('server nft path passes the pacote install root (tempDir) as base to traceAndCopy', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    const flowSettings: Flow = {
      config: { platform: 'server' },
    };

    const buildOptions = await seedCachedServerBuild({
      outputPath,
      cacheDir,
      flowSettings,
    });

    await bundleCore(flowSettings, buildOptions, logger);

    // The bundler resolves TEMP_DIR from `buildOptions.tempDir` when set
    // (the tests set it to `cacheDir`). nft must trace from there so it
    // sees the same node_modules tree esbuild stage 1 used as
    // `absWorkingDir`. The entry passed to nft is a staged copy of the
    // bundle inside tempDir (path-escape guard rejects entries outside
    // base).
    expect(mockTraceAndCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: path.join(cacheDir, '__nft-flow.mjs'),
        base: cacheDir,
        outDir: outputDir,
      }),
    );
  });

  it('server nft path enforces assertDepsTraced against declared step packages', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    // The cross-check compares the trace fileList against the packages the
    // user declared in the flow (auto-added @walkeros/collector + step
    // packages). When trace returns an empty fileList, every declared
    // package is missing and the bundler throws.
    const flowSettings: Flow = {
      config: { platform: 'server' },
      sources: {
        http: { package: '@walkeros/server-source-express' },
      },
    };

    const buildOptions = await seedCachedServerBuild({
      outputPath,
      cacheDir,
      flowSettings,
      bundleText: "import '@walkeros/server-source-express';\n",
    });

    // traceAndCopy returns an empty fileList; the cross-check fires for the
    // packages the bundle imports.
    mockTraceAndCopy.mockResolvedValue({
      fileList: [],
      copied: 0,
      reasons: new Map(),
    });

    await expect(
      bundleCore(flowSettings, buildOptions, logger),
    ).rejects.toThrow(/@walkeros\/server-source-express/);
  });

  it('warns instead of failing for a declared package nothing imports', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputPath = path.join(tmp, 'out', 'flow.mjs');
    const warnLogs: string[] = [];
    jest.spyOn(logger, 'warn').mockImplementation((message: string | Error) => {
      warnLogs.push(typeof message === 'string' ? message : message.message);
    });

    // A step package declares @walkeros/server-core as a dependency but only
    // uses its types, so the bundle never imports it and nft never reaches it.
    const flowSettings: Flow = {
      config: { platform: 'server' },
      destinations: {
        pubsub: { package: '@walkeros/server-destination-gcp' },
      },
    };
    const buildOptions = await seedCachedServerBuild({
      outputPath,
      cacheDir,
      flowSettings,
      extraPackages: { '@walkeros/server-core': {} },
    });
    mockTraceAndCopy.mockResolvedValue({
      fileList: [
        'node_modules/@walkeros/collector/package.json',
        'node_modules/@walkeros/server-destination-gcp/package.json',
      ],
      copied: 2,
      reasons: new Map(),
    });

    await bundleCore(flowSettings, buildOptions, logger);

    expect(warnLogs).toEqual([
      'Package @walkeros/server-core is declared in bundle.packages but nothing imports it; it is not in the bundle. Remove it from bundle.packages if unused.',
    ]);
  });

  describe('package used only through bundle.packages imports', () => {
    // The entry codegen turns `imports: ['helper']` into a bare import of
    // pkg-util, which is how inline code reaches it.
    const flowSettings: Flow = { config: { platform: 'server' } };

    async function seed(): Promise<BuildOptions> {
      return seedCachedServerBuild({
        outputPath: path.join(tmp, 'out', 'flow.mjs'),
        cacheDir: path.join(tmp, 'cache'),
        flowSettings,
        extraPackages: { 'pkg-util': { imports: ['helper'] } },
        bundleText: "import { helper } from 'pkg-util';\nhelper();\n",
      });
    }

    it('passes without a warning when the trace reaches it', async () => {
      const warn = jest.spyOn(logger, 'warn');
      const buildOptions = await seed();
      mockTraceAndCopy.mockResolvedValue({
        fileList: ['node_modules/pkg-util/package.json'],
        copied: 1,
        reasons: new Map(),
      });

      await bundleCore(flowSettings, buildOptions, logger);

      expect(warn).not.toHaveBeenCalled();
    });

    it('is still checked: a trace that misses it throws', async () => {
      const buildOptions = await seed();

      await expect(
        bundleCore(flowSettings, buildOptions, logger),
      ).rejects.toThrow(/resolved packages missing from trace: pkg-util/);
    });
  });

  it('serves a seeded build from the cache', async () => {
    const outputPath = path.join(tmp, 'out', 'flow.mjs');
    const flowSettings: Flow = { config: { platform: 'server' } };
    const buildOptions = await seedCachedServerBuild({
      outputPath,
      cacheDir: path.join(tmp, 'cache'),
      flowSettings,
      bundleText: '// seeded\n',
    });
    const info = jest.spyOn(logger, 'info');

    await bundleCore(flowSettings, buildOptions, logger);

    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/^Output: .* \([\d.]+ KB, cached\)$/),
    );
    expect(await fs.readFile(outputPath, 'utf-8')).toBe('// seeded\n');
  });

  it('copies include folders on a cache hit into a clean output dir', async () => {
    await fs.outputFile(path.join(tmp, 'shared', 'data.json'), '{}');
    const outputDir = path.join(tmp, 'out');
    const flowSettings: Flow = { config: { platform: 'server' } };
    const buildOptions = await seedCachedServerBuild({
      outputPath: path.join(outputDir, 'flow.mjs'),
      cacheDir: path.join(tmp, 'cache'),
      flowSettings,
      include: ['shared'],
    });
    const info = jest.spyOn(logger, 'info');

    await bundleCore(flowSettings, buildOptions, logger);

    expect(info).toHaveBeenCalledWith(expect.stringMatching(/, cached\)$/));
    expect(
      await fs.pathExists(path.join(outputDir, 'shared', 'data.json')),
    ).toBe(true);
  });

  it('has removed its own build dir when the bundle resolves', async () => {
    const flowSettings: Flow = { config: { platform: 'server' } };
    const seeded = await seedCachedServerBuild({
      outputPath: path.join(tmp, 'out', 'flow.mjs'),
      cacheDir: path.join(tmp, 'cache'),
      flowSettings,
    });
    // Without `tempDir` the bundler makes (and must remove) its own run dir;
    // the cache then lives under the default temp root, so seed it there.
    const buildOptions: BuildOptions = { ...seeded, tempDir: undefined };
    const content = generateCacheKeyContent(
      flowSettings,
      buildOptions,
      await getHashServer('', 12),
    );
    await cacheBuild(content, '// cached server bundle\n');
    const created: string[] = [];
    jest.mocked(tmpRunDir).mockImplementationOnce(async (kind, tmpDir) => {
      const actual = jest.requireActual<
        typeof import('../../../core/tmp-names.js')
      >('../../../core/tmp-names.js');
      const dir = await actual.tmpRunDir(kind, tmpDir);
      created.push(dir);
      return dir;
    });
    const info = jest.spyOn(logger, 'info');

    try {
      await bundleCore(flowSettings, buildOptions, logger);

      expect(info).toHaveBeenCalledWith(expect.stringMatching(/, cached\)$/));
      expect(created).toHaveLength(1);
      expect(await fs.pathExists(created[0])).toBe(false);
    } finally {
      await fs.remove(await getBuildCachePath(content));
    }
  });

  it('logs an Output line for a temp-dir bundle without masking its path', async () => {
    const runDir = await tmpRunDir('bundle');
    const lines: string[] = [];
    const lineLogger = createCLILogger({
      silent: true,
      onLine: (_level, message) => lines.push(message),
    });
    try {
      const flowSettings: Flow = { config: { platform: 'server' } };
      const buildOptions = await seedCachedServerBuild({
        outputPath: path.join(runDir, 'bundle.mjs'),
        cacheDir: path.join(tmp, 'cache'),
        flowSettings,
      });

      await bundleCore(flowSettings, buildOptions, lineLogger);

      const output = lines.find((line) => line.startsWith('Output: '));
      expect(output).toMatch(
        /^Output: \$TMPDIR\/walkeros\/bundle\/[\w-]{6}\/bundle\.mjs \(/,
      );
    } finally {
      await fs.remove(runDir);
    }
  });

  it('browser (web) platform skips the nft trace step entirely', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'walker.js');

    const flowSettings: Flow = {
      config: { platform: 'web' },
    };

    const buildOptions: BuildOptions = {
      output: outputPath,
      tempDir: cacheDir,
      cache: true,
      packages: {},
      format: 'iife',
      platform: 'browser',
      configDir: tmp,
    };
    const versionsHash = await getHashServer('', 12);
    await cacheBuild(
      generateCacheKeyContent(flowSettings, buildOptions, versionsHash),
      '// cached web bundle\n',
      cacheDir,
    );

    await bundleCore(flowSettings, buildOptions, logger);

    expect(mockTraceAndCopy).not.toHaveBeenCalled();
    // No sidecar package.json for web bundles — esbuild emits a self-
    // contained IIFE.
    expect(await fs.pathExists(path.join(outputDir, 'package.json'))).toBe(
      false,
    );
  });

  it('a cached browser build logs the include-ignored line once and copies nothing', async () => {
    await fs.outputFile(path.join(tmp, 'shared', 'data.json'), '{}');
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const flowSettings: Flow = { config: { platform: 'web' } };
    const buildOptions: BuildOptions = {
      output: path.join(outputDir, 'walker.js'),
      tempDir: cacheDir,
      cache: true,
      packages: {},
      format: 'iife',
      platform: 'browser',
      configDir: tmp,
      include: ['shared'],
    };
    await cacheBuild(
      generateCacheKeyContent(
        flowSettings,
        buildOptions,
        await getHashServer('', 12),
      ),
      '// cached web bundle\n',
      cacheDir,
    );
    const info = jest.spyOn(logger, 'info');

    await bundleCore(flowSettings, buildOptions, logger);

    expect(info).toHaveBeenCalledWith(expect.stringMatching(/, cached\)$/));
    expect(
      info.mock.calls.filter(
        ([message]) =>
          message ===
          'include is ignored for web builds: a browser bundle cannot read local folders.',
      ),
    ).toHaveLength(1);
    expect(await fs.pathExists(path.join(outputDir, 'shared'))).toBe(false);
  });
});

/**
 * Cache-key invalidation signal: `generateCacheKeyContent` includes
 * `versionsHash`, computed from pacote's resolved top-level set. When
 * the resolved versions change (e.g. a `flow.<name>.config.bundle.packages` version
 * bump or any pacote re-resolution), the cache key shifts and the build
 * is re-run. This is the right signal because pacote (not the user's
 * package-lock.json) is the install layer in the zero-setup design.
 *
 * We prove this by spying on `cacheBuild` / `getCachedBuild`. On a cache
 * hit, only the first build calls `cacheBuild` (the second short-circuits
 * via `getCachedBuild` returning a non-null entry). On a cache miss, both
 * builds call `cacheBuild` (the second cannot find the first's slot
 * because versionsHash shifted).
 *
 * If versionsHash were silently dropped from the cache key, the miss
 * test would observe `cacheBuild` called only once (because the second
 * build would hit the same key as the first). This pair of assertions
 * is what gives the test its bite.
 */
describe('cache key hashes pacote-resolved versionsHash', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-versionhash-'));

    mockTraceAndCopy.mockResolvedValue({
      fileList: [],
      copied: 0,
      reasons: new Map(),
    });
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('cache hit when resolved versions are unchanged: only first build writes cache, second reads it', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    // Stable resolution across both builds → identical versionsHash.
    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map(),
      resolution: {
        topLevel: new Map([['foo', { name: 'foo', version: '1.0.0' }]]),
        nested: [],
      },
    });
    // Trace must include the resolved package so assertDepsTraced passes.
    mockTraceAndCopy.mockResolvedValue({
      fileList: ['node_modules/foo/package.json'],
      copied: 1,
      reasons: new Map(),
    });

    const flowSettings: Flow = {
      config: { platform: 'server' },
    };
    const buildOptions: BuildOptions = {
      output: outputPath,
      tempDir: cacheDir,
      cache: true,
      packages: {},
      format: 'esm',
      platform: 'node',
      configDir: tmp,
    };

    // First build: cache miss, populates the slot.
    await bundleCore(flowSettings, buildOptions, logger);
    expect(await fs.pathExists(outputPath)).toBe(true);
    expect(mockCacheBuild).toHaveBeenCalledTimes(1);

    // Second build with the SAME resolution. Remove output to force the
    // bundler to actually restore from cache (proves it isn't a no-op).
    await fs.remove(outputPath);

    await bundleCore(flowSettings, buildOptions, logger);

    expect(await fs.pathExists(outputPath)).toBe(true);
    // Critical assertion: cacheBuild was NOT called a second time. The
    // second build hit the cache and skipped the esbuild + cache-write
    // path entirely.
    expect(mockCacheBuild).toHaveBeenCalledTimes(1);
    // And getCachedBuild returned a non-null entry on the second call
    // (proves the hit path actually ran).
    const cachedReturns = await Promise.all(
      mockGetCachedBuild.mock.results.map((r) => r.value),
    );
    expect(cachedReturns.some((v) => typeof v === 'string')).toBe(true);
  });

  it('cache miss when resolved versions change: both builds write cache under different keys', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    const flowSettings: Flow = {
      config: { platform: 'server' },
    };
    const buildOptions: BuildOptions = {
      output: outputPath,
      tempDir: cacheDir,
      cache: true,
      packages: {},
      format: 'esm',
      platform: 'node',
      configDir: tmp,
    };

    // Trace must include the resolved package so assertDepsTraced passes.
    mockTraceAndCopy.mockResolvedValue({
      fileList: ['node_modules/foo/package.json'],
      copied: 1,
      reasons: new Map(),
    });

    // First build with version 1.0.0.
    mockDownloadWithResolution.mockResolvedValueOnce({
      packagePaths: new Map(),
      resolution: {
        topLevel: new Map([['foo', { name: 'foo', version: '1.0.0' }]]),
        nested: [],
      },
    });
    await bundleCore(flowSettings, buildOptions, logger);
    expect(mockCacheBuild).toHaveBeenCalledTimes(1);
    const firstKey = mockCacheBuild.mock.calls[0][0];

    // Bump the version (simulate a `flow.<name>.config.bundle.packages` version bump
    // or any pacote re-resolution that produces a different top-level set).
    mockDownloadWithResolution.mockResolvedValueOnce({
      packagePaths: new Map(),
      resolution: {
        topLevel: new Map([['foo', { name: 'foo', version: '1.0.1' }]]),
        nested: [],
      },
    });
    await fs.remove(outputPath);
    await bundleCore(flowSettings, buildOptions, logger);

    // Critical assertion: cacheBuild was called a SECOND time. The
    // changed resolution produced a different versionsHash, so the second
    // build couldn't find the first build's slot and had to re-run
    // esbuild + cache the result under the new key.
    expect(mockCacheBuild).toHaveBeenCalledTimes(2);
    const secondKey = mockCacheBuild.mock.calls[1][0];
    expect(secondKey).not.toBe(firstKey);
  });
});

describe('legacy walkerOS.bundle annotation warning', () => {
  let tmp: string;
  let warnLogs: string[];
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-walkerosbundle-'));
    warnLogs = [];
    jest.spyOn(logger, 'warn').mockImplementation((message: string | Error) => {
      warnLogs.push(typeof message === 'string' ? message : message.message);
    });

    mockTraceAndCopy.mockResolvedValue({
      fileList: ['node_modules/legacy-pkg/package.json'],
      copied: 1,
      reasons: new Map(),
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(tmp);
  });

  it('warns once per package whose manifest still declares walkerOS.bundle', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    const fakePkgDir = path.join(tmp, 'fake-legacy');
    await fs.ensureDir(fakePkgDir);
    await fs.writeJson(path.join(fakePkgDir, 'package.json'), {
      name: 'legacy-pkg',
      version: '1.0.0',
      walkerOS: {
        type: 'destination',
        bundle: { external: ['some-runtime-dep'] },
      },
    });

    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map([['legacy-pkg', fakePkgDir]]),
      resolution: {
        topLevel: new Map([
          ['legacy-pkg', { name: 'legacy-pkg', version: '1.0.0' }],
        ]),
        nested: [],
      },
    });

    const flowSettings: Flow = {
      config: { platform: 'server' },
    };
    const buildOptions: BuildOptions = {
      output: outputPath,
      tempDir: cacheDir,
      cache: false,
      packages: { 'legacy-pkg': { version: '1.0.0' } },
      format: 'esm',
      platform: 'node',
      configDir: tmp,
    };

    await bundleCore(flowSettings, buildOptions, logger);

    const matching = warnLogs.filter(
      (m) =>
        m.includes('legacy-pkg') &&
        m.includes('walkerOS.bundle') &&
        m.includes('@walkeros/cli@4.x'),
    );
    expect(matching.length).toBe(1);
    expect(matching[0]).toContain('external');
  });

  it('does not warn for packages without walkerOS.bundle field', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    const fakePkgDir = path.join(tmp, 'fake-clean');
    await fs.ensureDir(fakePkgDir);
    await fs.writeJson(path.join(fakePkgDir, 'package.json'), {
      name: 'clean-pkg',
      version: '1.0.0',
      walkerOS: { type: 'destination', platform: ['server'] },
    });

    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map([['clean-pkg', fakePkgDir]]),
      resolution: {
        topLevel: new Map([
          ['clean-pkg', { name: 'clean-pkg', version: '1.0.0' }],
        ]),
        nested: [],
      },
    });
    mockTraceAndCopy.mockResolvedValue({
      fileList: ['node_modules/clean-pkg/package.json'],
      copied: 1,
      reasons: new Map(),
    });

    const flowSettings: Flow = {
      config: { platform: 'server' },
    };
    const buildOptions: BuildOptions = {
      output: outputPath,
      tempDir: cacheDir,
      cache: false,
      packages: { 'clean-pkg': { version: '1.0.0' } },
      format: 'esm',
      platform: 'node',
      configDir: tmp,
    };

    await bundleCore(flowSettings, buildOptions, logger);

    const bundleWarns = warnLogs.filter((m) => m.includes('walkerOS.bundle'));
    expect(bundleWarns).toEqual([]);
  });
});

describe('root include per platform', () => {
  let tmp: string;
  let infoLogs: string[];
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bundler-include-'));
    await fs.outputFile(path.join(tmp, 'shared', 'asset.txt'), 'asset');
    infoLogs = [];
    jest.spyOn(logger, 'info').mockImplementation((message: string | Error) => {
      infoLogs.push(typeof message === 'string' ? message : message.message);
    });
    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map(),
      resolution: { topLevel: new Map(), nested: [] },
    });
    mockTraceAndCopy.mockResolvedValue({
      fileList: [],
      copied: 0,
      reasons: new Map(),
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(tmp);
  });

  function includeBuild(
    platform: 'browser' | 'node',
    output: string,
  ): BuildOptions {
    return {
      output,
      tempDir: path.join(tmp, 'cache'),
      cache: false,
      packages: {},
      format: platform === 'browser' ? 'iife' : 'esm',
      platform,
      configDir: tmp,
      include: ['shared'],
    };
  }

  const skipped =
    'include is ignored for web builds: a browser bundle cannot read local folders.';

  it('skips include for a browser build written into the included folder', async () => {
    const output = path.join(tmp, 'shared', 'walker.js');
    await bundleCore(
      { config: { platform: 'web' } },
      includeBuild('browser', output),
      logger,
    );

    expect(await fs.pathExists(output)).toBe(true);
    expect(await fs.pathExists(path.join(tmp, 'shared', 'shared'))).toBe(false);
    expect(infoLogs.filter((m) => m === skipped)).toHaveLength(1);
  });

  it('copies include next to a server build', async () => {
    const output = path.join(tmp, 'dist', 'flow.mjs');
    await bundleCore(
      { config: { platform: 'server' } },
      includeBuild('node', output),
      logger,
    );

    expect(
      await fs.readFile(path.join(tmp, 'dist', 'shared', 'asset.txt'), 'utf8'),
    ).toBe('asset');
    expect(infoLogs).not.toContain(skipped);
  });

  it('still refuses a server build written into the included folder', async () => {
    await expect(
      bundleCore(
        { config: { platform: 'server' } },
        includeBuild('node', path.join(tmp, 'shared', 'flow.mjs')),
        logger,
      ),
    ).rejects.toThrow(/Circular include/);
  });
});
