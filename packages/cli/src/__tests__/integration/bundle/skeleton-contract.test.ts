/**
 * KEYSTONE anti-drift contract test: ONE skeleton, BOTH contracts.
 *
 * The original bug existed because "dev-free for deploy" and "dev-available
 * for simulate" were two separate artifacts built under two separate
 * assumptions that drifted apart. The unification makes a single skeleton
 * serve both paths. This test asserts BOTH properties off the SAME single
 * skeleton build so they can never drift again:
 *
 *   1. Simulate contract: the skeleton exposes a lazy `__devExports` registry
 *      whose thunks resolve each package's `/dev` module on demand, so the
 *      simulate/preview path can introspect schemas and examples.
 *   2. Deploy purity: running the real deploy wrap (`wrapSkeleton`) on that
 *      SAME skeleton file produces output with zero dev-only zod graph.
 *
 * Do NOT split this into two independent builds. Two builds re-create the
 * drift surface inside the test suite, the very failure mode this guards.
 *
 * Sentinel discipline:
 *   - Deploy purity uses ONLY dev-only zod sentinels (`zodToSchema`,
 *     `toJSONSchema`, `_zod`, `ZodObject`). These live solely in the `/dev`
 *     zod graph.
 *   - `createTrigger` is a legitimate RUNTIME export of the browser source and
 *     appears in production bundles. It is NOT a dev-leak marker, so it is used
 *     ONLY for the simulate-resolution assertion, never for purity.
 */

import fs from 'fs-extra';
import path from 'path';
import { pathToFileURL } from 'url';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { wrapSkeleton } from '../../../commands/bundle/wrap.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Logger } from '@walkeros/core';

// Skeletons are written inside the CLI package tree (not os.tmpdir) so that the
// runtime dynamic `import('<pkg>/dev')` inside the skeleton resolves bare
// `@walkeros/*` specifiers against the workspace node_modules, exactly as it
// would when the simulate path imports a real skeleton.
const cliRoot = path.resolve(__dirname, '../../../..');
const workDir = path.join(cliRoot, '.tmp/skeleton-contract');

// Dev-only zod-graph sentinels. Each lives ONLY in a package's `/dev` module
// (the schema/zod graph), never in the runtime entry. Their presence in a
// wrapped deploy bundle means the /dev graph leaked.
const DEV_ZOD_SENTINELS = ['zodToSchema', 'toJSONSchema', '_zod', 'ZodObject'];

interface PlatformCase {
  name: string;
  platform: 'browser' | 'node';
  pkg: string;
  flow: unknown;
}

const cases: PlatformCase[] = [
  {
    name: 'web/browser',
    platform: 'browser',
    pkg: '@walkeros/web-source-browser',
    flow: {
      version: 4,
      flows: {
        default: {
          sources: { browser: { package: '@walkeros/web-source-browser' } },
          destinations: { demo: { package: '@walkeros/destination-demo' } },
          config: {
            platform: 'web',
            bundle: {
              packages: {
                '@walkeros/collector': {
                  version: 'latest',
                  imports: ['startFlow'],
                },
                '@walkeros/web-source-browser': { version: 'latest' },
                '@walkeros/destination-demo': { version: 'latest' },
              },
            },
          },
        },
      },
    },
  },
  {
    name: 'server/node',
    platform: 'node',
    pkg: '@walkeros/server-source-fetch',
    flow: {
      version: 4,
      flows: {
        default: {
          sources: { fetch: { package: '@walkeros/server-source-fetch' } },
          destinations: { demo: { package: '@walkeros/destination-demo' } },
          config: {
            platform: 'server',
            bundle: {
              packages: {
                '@walkeros/collector': {
                  version: 'latest',
                  imports: ['startFlow'],
                },
                '@walkeros/server-source-fetch': { version: 'latest' },
                '@walkeros/destination-demo': { version: 'latest' },
              },
            },
          },
        },
      },
    },
  },
];

describe('skeleton contract (one build, both contracts)', () => {
  let logger: Logger.Instance;

  beforeAll(async () => {
    await fs.ensureDir(workDir);
  });

  beforeEach(() => {
    logger = createCLILogger({ silent: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await fs.remove(workDir).catch(() => {});
  });

  describe.each(cases)('$name', ({ platform, pkg, flow }) => {
    it('serves simulate (lazy /dev resolves) AND deploy (dev-free) off ONE skeleton build', async () => {
      const caseDir = path.join(workDir, platform);
      await fs.ensureDir(caseDir);
      const skeletonPath = path.join(caseDir, 'skeleton.mjs');

      // ── ONE build: the unified skeleton (skipWrapper, withDev). ──────────
      const { flowSettings, buildOptions } = loadBundleConfig(flow, {
        configPath: path.join(caseDir, 'flow.json'),
      });
      buildOptions.output = skeletonPath;
      buildOptions.platform = platform;
      buildOptions.format = 'esm';
      buildOptions.skipWrapper = true;
      buildOptions.withDev = true;
      // Deploy skeletons (cdn-skeleton / runner) externalize `<pkg>/dev` so the
      // browser registry stays a literal lazy import that the wrap DCEs.
      buildOptions.externalizeDev = true;
      buildOptions.cache = false;
      buildOptions.minify = false;

      await bundleCore(flowSettings, buildOptions, logger);

      // ── Contract 1: simulate resolution off that build. ─────────────────
      // The skeleton externalizes `<pkg>/dev` as a literal lazy import, so
      // the dev graph is not inlined but stays resolvable on demand.
      const skeletonText = await fs.readFile(skeletonPath, 'utf-8');
      expect(skeletonText).toContain('__devExports');
      expect(skeletonText).toMatch(
        new RegExp(`import\\(["']${pkg.replace(/[/\\]/g, '\\$&')}/dev["']\\)`),
      );

      const skeletonModule = await import(pathToFileURL(skeletonPath).href);
      const registry = skeletonModule.__devExports;
      expect(typeof registry[pkg]).toBe('function');

      const devModule = await registry[pkg]();
      expect(typeof devModule.examples.createTrigger).toBe('function');

      // ── Contract 2: deploy purity off the SAME skeleton file. ───────────
      // Run the real deploy wrap (stage-2) on the skeleton we just built and
      // resolved. The unreferenced lazy registry must be DCE'd, leaving zero
      // dev-only zod graph in the wrapped output.
      const wrappedPath = path.join(caseDir, 'wrapped.js');
      await wrapSkeleton({
        skeletonPath,
        platform,
        outputPath: wrappedPath,
        minify: false,
        ...(platform === 'browser'
          ? { windowCollector: 'collector', windowElb: 'elb' }
          : {}),
      });

      const wrappedText = await fs.readFile(wrappedPath, 'utf-8');
      for (const sentinel of DEV_ZOD_SENTINELS) {
        expect(wrappedText).not.toContain(sentinel);
      }
      // No `<pkg>/dev` import path may survive into the deploy bundle.
      expect(wrappedText).not.toMatch(/@walkeros\/[\w-]+\/dev/);

      // If a sourcemap was emitted, grep it for the same sentinels: a leaked
      // dev symbol can hide in mappings/sources even when absent from code.
      const mapPath = `${wrappedPath}.map`;
      if (await fs.pathExists(mapPath)) {
        const mapText = await fs.readFile(mapPath, 'utf-8');
        for (const sentinel of DEV_ZOD_SENTINELS) {
          expect(mapText).not.toContain(sentinel);
        }
      }
    }, 120000);
  });
});
