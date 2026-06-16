/**
 * Data-injection seam for simulate functions.
 *
 * A skeleton bundle bakes its split config data as `__configData`. The
 * `data` option lets callers execute the same skeleton with a different
 * data payload (the wireConfig payload shape) without rebundling. The
 * injected payload REPLACES the baked one, so callers must provide the
 * full payload built from the full config.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bundleCore } from '../../bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { simulateDestination, simulateCollector } from '../index.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Flow, Logger } from '@walkeros/core';

const configPath = path.resolve(
  __dirname,
  '../../../../examples/flow-simple.json',
);

async function bundleFlow(
  config: Flow.Json,
  outputPath: string,
  logger: Logger.Instance,
): Promise<void> {
  const { flowSettings, buildOptions } = loadBundleConfig(config, {
    configPath,
  });
  buildOptions.output = outputPath;
  buildOptions.skipWrapper = true;
  buildOptions.format = 'esm';
  buildOptions.cache = false;
  buildOptions.minify = false;
  await bundleCore(flowSettings, buildOptions, logger);
}

describe('simulate data injection', () => {
  let tmpDir: string;
  let logger: Logger.Instance;
  let config: Flow.Json;
  let destinationBundlePath: string;
  let collectorConfig: Flow.Json;
  let collectorBundlePath: string;

  beforeAll(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `simulate-data-injection-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });

    // Bundle A: flow-simple as-is, baked destination name "Simple Demo"
    config = (await fs.readJSON(configPath)) as Flow.Json;
    destinationBundlePath = path.join(tmpDir, 'destination-bundle.mjs');
    await bundleFlow(config, destinationBundlePath, logger);

    // Bundle B: flow-simple plus a plain collector section (baked globals)
    collectorConfig = structuredClone(config);
    const flow = collectorConfig.flows.default;
    if (!flow) throw new Error('flow-simple.json must define a default flow');
    flow.collector = { globals: { tenant: 'baked-a' } };
    collectorBundlePath = path.join(tmpDir, 'collector-bundle.mjs');
    await bundleFlow(collectorConfig, collectorBundlePath, logger);
  }, 180000);

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('executes the baked data when no data option is given', async () => {
    const result = await simulateDestination(
      config,
      { name: 'entity action', data: { key: 'value' } },
      {
        destinationId: 'demo',
        bundlePath: destinationBundlePath,
        silent: true,
      },
    );

    expect(result.error).toBeUndefined();
    const logs = result.calls.map((call) => String(call.args[0]));
    expect(logs.some((line) => line.includes('[Simple Demo]'))).toBe(true);
  }, 60000);

  it('simulateDestination executes the injected data payload instead of the baked one', async () => {
    const result = await simulateDestination(
      config,
      { name: 'entity action', data: { key: 'value' } },
      {
        destinationId: 'demo',
        bundlePath: destinationBundlePath,
        silent: true,
        data: {
          destinations: {
            demo: {
              config: {
                settings: {
                  name: 'Injected Demo',
                  values: ['name', 'data'],
                },
              },
            },
          },
        },
      },
    );

    expect(result.error).toBeUndefined();
    const logs = result.calls.map((call) => String(call.args[0]));
    expect(logs.some((line) => line.includes('[Injected Demo]'))).toBe(true);
    expect(logs.some((line) => line.includes('[Simple Demo]'))).toBe(false);
  }, 60000);

  it('simulateCollector executes the injected data payload instead of the baked one', async () => {
    const baked = await simulateCollector(
      collectorConfig,
      { name: 'product view' },
      {
        collectorName: 'default',
        bundlePath: collectorBundlePath,
        silent: true,
      },
    );
    expect(baked.error).toBeUndefined();
    expect(baked.events[0]?.globals).toMatchObject({ tenant: 'baked-a' });

    const injected = await simulateCollector(
      collectorConfig,
      { name: 'product view' },
      {
        collectorName: 'default',
        bundlePath: collectorBundlePath,
        silent: true,
        data: {
          destinations: {
            demo: {
              config: {
                settings: {
                  name: 'Simple Demo',
                  values: ['name', 'data', 'user', 'consent'],
                },
              },
            },
          },
          collector: { globals: { tenant: 'injected-b' } },
        },
      },
    );
    expect(injected.error).toBeUndefined();
    expect(injected.events[0]?.globals).toMatchObject({
      tenant: 'injected-b',
    });
  }, 60000);
});
