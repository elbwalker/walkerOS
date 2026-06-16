/**
 * Matched mapping rule key on the destination simulate result.
 *
 * The destination push site emits per-event FlowState records carrying the
 * mappingKey computed by the runtime's processEventMapping. simulateDestination
 * observes those emissions, so the result reports the same rule the runtime
 * matched, including against injected data payloads.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bundleCore } from '../../bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { simulateDestination } from '../index.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Flow, Logger } from '@walkeros/core';

const configPath = path.resolve(
  __dirname,
  '../../../../examples/flow-simple.json',
);

const demoSettings = {
  name: 'Simple Demo',
  values: ['name', 'data'],
};

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

describe('simulateDestination mappingKey', () => {
  let tmpDir: string;
  let logger: Logger.Instance;
  let config: Flow.Json;
  let bundlePath: string;

  beforeAll(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `simulate-mapping-key-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });

    // flow-simple with a two-rule mapping baked onto the demo destination.
    config = (await fs.readJSON(configPath)) as Flow.Json;
    const flow = config.flows.default;
    if (!flow) throw new Error('flow-simple.json must define a default flow');
    flow.destinations = {
      demo: {
        package: '@walkeros/destination-demo',
        config: {
          settings: demoSettings,
          mapping: {
            product: {
              view: {},
              add: {},
            },
          },
        },
      },
    };
    bundlePath = path.join(tmpDir, 'mapping-key-bundle.mjs');
    await bundleFlow(config, bundlePath, logger);
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

  it('reports the matched rule key when the second rule matches', async () => {
    const result = await simulateDestination(
      config,
      { name: 'product add', data: { id: 'sku-1' } },
      {
        destinationId: 'demo',
        bundlePath,
        silent: true,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.mappingKey).toBe('product add');
  }, 60000);

  it('leaves mappingKey undefined and the result well-formed when no rule matches', async () => {
    const result = await simulateDestination(
      config,
      { name: 'order complete' },
      {
        destinationId: 'demo',
        bundlePath,
        silent: true,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.mappingKey).toBeUndefined();
    expect(result.step).toBe('destination');
    expect(result.name).toBe('demo');
    expect(Array.isArray(result.events)).toBe(true);
    expect(Array.isArray(result.calls)).toBe(true);
    expect(typeof result.duration).toBe('number');
  }, 60000);

  it('follows the injected mapping when options.data changes which rule matches', async () => {
    const result = await simulateDestination(
      config,
      { name: 'product add', data: { id: 'sku-1' } },
      {
        destinationId: 'demo',
        bundlePath,
        silent: true,
        data: {
          destinations: {
            demo: {
              config: {
                settings: demoSettings,
                mapping: {
                  product: {
                    '*': {},
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(result.error).toBeUndefined();
    // The baked mapping would match 'product add'; the injected mapping only
    // has the wildcard action rule, so the runtime must report 'product *'.
    expect(result.mappingKey).toBe('product *');
  }, 60000);
});
