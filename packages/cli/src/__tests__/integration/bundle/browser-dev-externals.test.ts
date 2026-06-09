/**
 * Integration Test: browser skeleton externalizes each `<pkg>/dev`
 *
 * Proves the option-A externalization: a browser skeleton build (withDev /
 * skipWrapper) keeps the lazy `/dev` registry a literal `import('<pkg>/dev')`
 * instead of inlining the /dev graph (zod schemas, zodToSchema, etc.). The
 * deploy wrap DCEs the unreferenced registry, while simulate/preview resolve
 * the dev module on demand.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Logger } from '@walkeros/core';

const SOURCE_PKG = '@walkeros/web-source-browser';

// @walkeros/web-source-browser genuinely exposes ./dev. `zodToSchema` lives in
// its dev module only (not in the runtime entry), so it is a clean sentinel
// for whether the /dev graph got inlined.
const browserFlow = {
  version: 4,
  flows: {
    default: {
      sources: {
        browser: {
          package: '@walkeros/web-source-browser',
        },
      },
      destinations: {
        demo: {
          package: '@walkeros/destination-demo',
        },
      },
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
};

describe('browser skeleton /dev externals', () => {
  let tmpDir: string;
  let logger: Logger.Instance;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `browser-dev-externals-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    jest.restoreAllMocks();
  });

  it('externalizeDev:true keeps `<pkg>/dev` external+literal and does NOT inline the /dev graph', async () => {
    const { flowSettings, buildOptions } = loadBundleConfig(browserFlow, {
      configPath: path.join(tmpDir, 'flow.json'),
    });

    // Browser ESM deploy skeleton (skipWrapper, externalizeDev). Disable cache +
    // minify so we can grep the raw stage-1 text deterministically.
    buildOptions.output = path.join(tmpDir, 'skeleton.mjs');
    buildOptions.platform = 'browser';
    buildOptions.format = 'esm';
    buildOptions.skipWrapper = true;
    buildOptions.withDev = true;
    buildOptions.externalizeDev = true;
    buildOptions.cache = false;
    buildOptions.minify = false;

    await bundleCore(flowSettings, buildOptions, logger);

    const output = await fs.readFile(buildOptions.output, 'utf-8');

    // The lazy registry survives as a literal dynamic import of the /dev
    // subpath (esbuild normalizes the quote style, so match quote-agnostic).
    expect(output).toMatch(
      /import\(["']@walkeros\/web-source-browser\/dev["']\)/,
    );

    // The /dev body is NOT inlined: a dev-only symbol must be absent.
    expect(output).not.toContain('zodToSchema');
  }, 60000);

  it('externalizeDev:false INLINES the /dev graph and resolves host-free', async () => {
    const { flowSettings, buildOptions } = loadBundleConfig(browserFlow, {
      configPath: path.join(tmpDir, 'flow.json'),
    });

    // Same flow, same codegen, in-process simulate shape (externalizeDev:false).
    // esbuild inlines the /dev graph so the lazy thunk resolves a bundled module.
    buildOptions.output = path.join(tmpDir, 'simulate.mjs');
    buildOptions.platform = 'browser';
    buildOptions.format = 'esm';
    buildOptions.skipWrapper = true;
    buildOptions.withDev = true;
    buildOptions.externalizeDev = false;
    buildOptions.cache = false;
    buildOptions.minify = false;

    await bundleCore(flowSettings, buildOptions, logger);

    const output = await fs.readFile(buildOptions.output, 'utf-8');

    // The /dev graph IS inlined: a dev-only zod symbol must be present, and no
    // literal external `<pkg>/dev` import survives.
    expect(output).toContain('zodToSchema');
    expect(output).not.toMatch(
      /import\(["']@walkeros\/web-source-browser\/dev["']\)/,
    );

    // tmpDir is under os.tmpdir() with no co-located node_modules (the lean
    // simulate-server condition). The inlined lazy thunk must resolve without
    // any host filesystem lookup.
    const moduleUnderTest = await import(
      pathToFileURL(buildOptions.output).href
    );
    const devModule = await moduleUnderTest.__devExports[SOURCE_PKG]();
    expect(typeof devModule.examples.createTrigger).toBe('function');
  }, 60000);
});
