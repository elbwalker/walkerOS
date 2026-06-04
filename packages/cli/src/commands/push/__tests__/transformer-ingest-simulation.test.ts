/**
 * Integration Test: standalone transformer simulation with a caller-supplied ingest.
 *
 * A request-reading decoder transformer (@walkeros/transformer-ga4) reads the
 * raw request off `ctx.ingest.url`. simulateTransformer builds a fresh empty
 * ingest, so without a caller-supplied ingest the decoder finds no url and
 * drops. This proves the `ingest` option lets the decoder be simulated
 * standalone: a `{ url }` is merged onto the fresh ingest (so `_meta` stays
 * present) and the GA4 page_view request decodes into a walkerOS event.
 *
 * The request URL and expected output come from the ga4 pageView step example
 * (@walkeros/transformer-ga4/dev) rather than hardcoded literals.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { bundleCore } from '../../bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { simulateTransformer } from '../index.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import { examples } from '@walkeros/transformer-ga4/dev';
import type { Flow, Logger } from '@walkeros/core';

/**
 * Read the request URL off the ga4 pageView example. `StepExample.in` is typed
 * `unknown`, so narrow with `typeof` guards instead of a cast.
 */
function pageViewUrlFromExample(): string {
  const input = examples.step.pageView.in;
  if (
    input !== null &&
    typeof input === 'object' &&
    'url' in input &&
    typeof input.url === 'string'
  ) {
    return input.url;
  }
  throw new Error('ga4 pageView example has no string `in.url`');
}

const configPath = path.resolve(
  __dirname,
  '../../../../examples/flow-simple.json',
);

const config: Flow.Json = {
  version: 4,
  flows: {
    default: {
      transformers: {
        ga4: {
          package: '@walkeros/transformer-ga4',
          config: {},
        },
      },
      destinations: {
        demo: {
          package: '@walkeros/destination-demo',
          config: {},
        },
      },
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/collector': {
              version: 'latest',
              imports: ['startFlow'],
            },
            '@walkeros/transformer-ga4': {
              version: 'latest',
            },
            '@walkeros/destination-demo': {
              version: 'latest',
            },
          },
        },
      },
    },
  },
};

describe('transformer ingest simulation', () => {
  let tmpDir: string;
  let logger: Logger.Instance;
  let bundlePath: string;
  let pageViewUrl: string;

  beforeEach(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `transformer-ingest-sim-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    logger = createCLILogger({ silent: true });
    jest.spyOn(console, 'log').mockImplementation(() => {});

    pageViewUrl = pageViewUrlFromExample();

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

  it('decodes the GA4 request from ctx.ingest into a walkerOS event', async () => {
    const result = await simulateTransformer(
      config,
      { name: 'ga4 collect' },
      {
        transformerId: 'ga4',
        bundlePath,
        silent: true,
        ingest: { url: pageViewUrl },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      name: 'page view',
      entity: 'page',
      action: 'view',
      data: {
        id: 'https://shop.example.com/products/sku-123',
        title: 'Trail Runner Pro',
        referrer: 'https://shop.example.com/',
      },
    });
  }, 60000);

  it('without ingest, the GA4 decoder drops (back-compat)', async () => {
    const result = await simulateTransformer(
      config,
      { name: 'ga4 collect' },
      { transformerId: 'ga4', bundlePath, silent: true },
    );
    expect(result.error).toBeUndefined();
    expect(result.events).toEqual([]);
  }, 60000);
});
