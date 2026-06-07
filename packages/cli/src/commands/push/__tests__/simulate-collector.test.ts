import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bundleCore } from '../../bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { simulateCollector } from '../index.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { Flow, Logger } from '@walkeros/core';

const configPath = path.resolve(
  __dirname,
  '../../../../examples/flow-simple.json',
);

describe('simulateCollector', () => {
  let tmpDir: string;
  let logger: Logger.Instance;
  let config: Flow.Json;
  let bundlePath: string;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `simulate-collector-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});

    config = (await fs.readJSON(configPath)) as Flow.Json;

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
  }, 60000);

  afterEach(async () => {
    await fs.remove(tmpDir);
    jest.restoreAllMocks();
  });

  it('enriches a post-next event with seeded collector state', async () => {
    const result = await simulateCollector(
      config,
      { name: 'product view' },
      {
        collectorName: 'default',
        bundlePath,
        silent: true,
        state: {
          consent: { marketing: true },
          globals: { lang: 'en' },
          user: { id: 'u1' },
          timing: Date.now() - 5000,
        },
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.step).toBe('collector');

    const e = result.events[0];
    expect(e?.name).toBe('product view');
    expect(e?.entity).toBe('product');
    expect(e?.action).toBe('view');
    expect(typeof e?.id).toBe('string');
    expect(typeof e?.timestamp).toBe('number');
    expect(typeof e?.timing).toBe('number');
    expect(e?.timing).toBeGreaterThanOrEqual(0);
    expect(e?.source).toMatchObject({ type: 'collector', schema: '4' });
    expect(e?.globals).toMatchObject({ lang: 'en' });
    expect(e?.user).toMatchObject({ id: 'u1' });
    expect(e?.consent).toMatchObject({ marketing: true });
  }, 60000);
});
