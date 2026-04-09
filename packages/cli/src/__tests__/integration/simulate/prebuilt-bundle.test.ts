/**
 * Integration Test: Two-step simulation with pre-built bundle
 *
 * Proves the pattern: bundle once with skipWrapper, then simulate a destination
 * using the pre-built bundle path. This avoids re-bundling on every simulation.
 *
 * Steps:
 * 1. Bundle flow-simple.json with skipWrapper: true to produce an ESM with __devExports
 * 2. Call simulateDestination with bundlePath pointing to that bundle + a test event
 * 3. Verify success and that simulation output (usage) is captured
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bundleCore } from '../../../commands/bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { simulateDestination } from '../../../commands/push/index.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Flow, Logger } from '@walkeros/core';

const configPath = path.resolve(
  __dirname,
  '../../../../examples/flow-simple.json',
);

describe('prebuilt-bundle simulation', () => {
  let tmpDir: string;
  let logger: Logger.Instance;
  let config: Flow.Config;
  let bundlePath: string;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `prebuilt-sim-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Load the config once
    config = (await fs.readJSON(configPath)) as Flow.Config;

    // Step 1: Bundle with skipWrapper to produce a skeleton ESM
    const { flowSettings, buildOptions } = loadBundleConfig(config, {
      configPath,
    });

    bundlePath = path.join(tmpDir, 'bundle.mjs');
    buildOptions.output = bundlePath;
    buildOptions.skipWrapper = true;
    buildOptions.format = 'esm';
    buildOptions.cache = false;
    buildOptions.minify = false;

    await bundleCore(flowSettings, buildOptions, logger);

    // Verify the bundle was created and contains __devExports
    const bundleContent = await fs.readFile(bundlePath, 'utf-8');
    expect(bundleContent).toContain('__devExports');
    expect(bundleContent).toContain('wireConfig');
    expect(bundleContent).toContain('startFlow');
  }, 60000);

  afterEach(async () => {
    await fs.remove(tmpDir);
    jest.restoreAllMocks();
  });

  it('simulates a destination using a pre-built bundle', async () => {
    const testEvent = {
      name: 'entity action',
      data: { key: 'value' },
    };

    const result = await simulateDestination(config, testEvent, {
      destinationId: 'demo',
      bundlePath,
      silent: true,
    });

    // Core assertions: simulation succeeded
    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();

    // The destination-demo dev env tracks calls to env.log via simulation: ['call:log']
    // Verify that usage was captured (proving __devExports was loaded and wrapEnv worked)
    expect(result.usage).toBeDefined();
    expect(result.usage!['demo']).toBeDefined();
    expect(result.usage!['demo'].length).toBeGreaterThan(0);

    // Each tracked call should have the expected shape
    const call = result.usage!['demo'][0];
    expect(call).toHaveProperty('fn');
    expect(call).toHaveProperty('args');
    expect(call).toHaveProperty('ts');
    expect(call.fn).toBe('log');
  }, 60000);

  it('returns error for non-existent destination ID', async () => {
    const testEvent = {
      name: 'entity action',
      data: { key: 'value' },
    };

    const result = await simulateDestination(config, testEvent, {
      destinationId: 'nonexistent',
      bundlePath,
      silent: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('nonexistent');
  }, 60000);
});
