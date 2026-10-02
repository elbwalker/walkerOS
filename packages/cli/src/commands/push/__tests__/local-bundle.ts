import path from 'path';
import type { Flow } from '@walkeros/core';
import { bundleCore } from '../../bundle/bundler.js';
import { loadBundleConfig } from '../../../config/loader.js';
import { createCLILogger } from '../../../core/cli-logger.js';
import { injectLocalPaths } from '../../../__tests__/helpers/local-packages.js';

/**
 * Bundles a flow against the monorepo's own packages (their built `dist`),
 * so a simulate test runs today's code rather than a registry release. Every
 * declared package and its `@walkeros` dependencies get a local `path`.
 */

/**
 * Points the flow's packages at the monorepo (in place) and bundles it as the
 * ESM skeleton the simulate functions import. Returns the bundle path.
 */
export async function bundleLocalFlow(
  config: Flow.Json,
  outputPath: string,
  flowName?: string,
): Promise<string> {
  for (const flow of Object.values(config.flows))
    injectLocalPaths(flow, { keep: ['@walkeros/server-core'] });
  const { flowSettings, buildOptions } = loadBundleConfig(config, {
    configPath: path.join(path.dirname(outputPath), 'flow.json'),
    flowName,
  });
  buildOptions.output = outputPath;
  buildOptions.skipWrapper = true;
  buildOptions.format = 'esm';
  buildOptions.cache = false;
  buildOptions.minify = false;
  await bundleCore(
    flowSettings,
    buildOptions,
    createCLILogger({ silent: true }),
  );
  return outputPath;
}
