import path from 'path';
import fs from 'fs-extra';
import { getPlatform, type Flow } from '@walkeros/core';
import { createCLILogger } from '../../core/cli-logger.js';
import { getTmpPath } from '../../core/tmp.js';
import { loadBundleConfig } from '../../config/index.js';
import { bundleCore } from '../bundle/bundler.js';
import { buildOverrides, type PushOverrides } from './overrides.js';

export type PrepareInput =
  | {
      mode: 'build';
      config: Flow.Config;
      flow?: string;
      simulate?: string[];
      mock?: string[];
      silent?: boolean;
      verbose?: boolean;
    }
  | {
      mode: 'prebuilt';
      bundlePath: string;
      config: Flow.Config;
      flow?: string;
      simulate?: string[];
      mock?: string[];
      silent?: boolean;
      verbose?: boolean;
    };

export interface PreparedFlow {
  bundlePath: string;
  platform: 'web' | 'server';
  overrides: PushOverrides;
  flowSettings: Flow.Settings;
  cleanup: () => Promise<void>;
}

/**
 * Shared preparation step: resolve config, build overrides, optionally bundle.
 *
 * Two modes:
 * - 'build': bundles the flow config to a temp ESM file (original behavior)
 * - 'prebuilt': uses an existing bundle path, skips bundling
 *
 * Both modes resolve flowSettings and overrides from the provided config object.
 */
export async function prepareFlow(input: PrepareInput): Promise<PreparedFlow> {
  const logger = createCLILogger({
    silent: input.silent,
    verbose: input.verbose,
  });

  // Resolve config to flowSettings + buildOptions
  logger.debug('Loading flow configuration');
  const { flowSettings, buildOptions } = loadBundleConfig(input.config, {
    configPath: process.cwd(),
    flowName: input.flow,
  });

  const platform = getPlatform(flowSettings);

  // Build overrides from --simulate/--mock flags
  const overrides = buildOverrides(
    { simulate: input.simulate, mock: input.mock },
    flowSettings,
  );

  if (input.mode === 'prebuilt') {
    // Prebuilt mode: return immediately with existing bundle, no cleanup needed
    return {
      bundlePath: input.bundlePath,
      platform,
      overrides,
      flowSettings,
      cleanup: async () => {},
    };
  }

  // Build mode: bundle to temp file
  logger.debug('Bundling flow configuration');
  const tempDir = getTmpPath(
    undefined,
    `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  await fs.ensureDir(tempDir);
  const bundlePath = path.join(tempDir, 'bundle.mjs');

  const pushBuildOptions = {
    ...buildOptions,
    output: bundlePath,
    format: 'esm' as const,
    platform: platform === 'web' ? ('browser' as const) : ('node' as const),
    skipWrapper: true, // CLI imports ESM directly -- no platform wrapper
  };

  await bundleCore(flowSettings, pushBuildOptions, logger, false);

  logger.debug(`Bundle created: ${bundlePath}`);

  return {
    bundlePath,
    platform,
    overrides,
    flowSettings,
    cleanup: async () => {
      await fs.remove(tempDir).catch(() => {});
    },
  };
}
