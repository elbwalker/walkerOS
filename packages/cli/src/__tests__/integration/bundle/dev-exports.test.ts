/**
 * Integration Test: __devExports in bundle output
 *
 * Verifies that stage 1 (skipWrapper) bundles include __devExports
 * for packages exposing ./dev, and that stage 2 (production) bundles
 * tree-shake it out.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Logger } from '@walkeros/core';

const configPath = path.resolve(
  __dirname,
  '../../../../examples/flow-simple.json',
);

describe('__devExports bundling', () => {
  let tmpDir: string;
  let logger: Logger.Instance;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `dev-exports-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    jest.restoreAllMocks();
  });

  it('includes __devExports in skipWrapper output', async () => {
    const rawConfig = await fs.readJSON(configPath);
    const { flowSettings, buildOptions } = loadBundleConfig(rawConfig, {
      configPath,
    });

    // Override for stage 1 ESM output
    buildOptions.output = path.join(tmpDir, 'stage1.mjs');
    buildOptions.skipWrapper = true;
    buildOptions.format = 'esm';
    buildOptions.cache = false;
    buildOptions.minify = false;

    await bundleCore(flowSettings, buildOptions, logger);

    const output = await fs.readFile(buildOptions.output, 'utf-8');
    expect(output).toContain('__devExports');
    expect(output).toContain('wireConfig');
    expect(output).toContain('startFlow');
  }, 60000);

  it('does NOT include __devExports in stage 2 production output', async () => {
    const rawConfig = await fs.readJSON(configPath);
    const { flowSettings, buildOptions } = loadBundleConfig(rawConfig, {
      configPath,
    });

    // Production mode: keep defaults (IIFE/wrapper), disable cache
    buildOptions.output = path.join(tmpDir, 'production.js');
    buildOptions.cache = false;

    await bundleCore(flowSettings, buildOptions, logger);

    const output = await fs.readFile(buildOptions.output, 'utf-8');
    expect(output).not.toContain('__devExports');
  }, 60000);
});
