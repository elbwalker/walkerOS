import path from 'path';
import fs from 'fs-extra';
import { getPlatform, type Flow, type Logger } from '@walkeros/core';
import { createCLILogger } from '../../core/cli-logger.js';
import { getTmpPath } from '../../core/tmp.js';
import { loadFlowConfig } from '../../config/index.js';
import { bundleCore } from '../bundle/bundler.js';
import { buildOverrides, type PushOverrides } from './overrides.js';

export interface PrepareOptions {
  configPath: string;
  flow?: string;
  simulate?: string[];
  mock?: string[];
  silent?: boolean;
  verbose?: boolean;
}

export interface PreparedFlow {
  bundlePath: string;
  platform: 'web' | 'server';
  overrides: PushOverrides;
  flowSettings: Flow.Settings;
  configDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Shared preparation step: load config, build overrides, bundle to temp ESM.
 *
 * Shared by simulateSource, simulateTransformer, and simulateDestination
 * so each simulation function starts from the same prepared state.
 */
export async function prepareFlow(
  options: PrepareOptions,
): Promise<PreparedFlow> {
  const logger = createCLILogger({
    silent: options.silent,
    verbose: options.verbose,
  });

  // Load config
  logger.debug('Loading flow configuration');
  const { flowSettings, buildOptions } = await loadFlowConfig(
    options.configPath,
    {
      flowName: options.flow,
      logger,
    },
  );

  const platform = getPlatform(flowSettings);
  const configDir = buildOptions.configDir || process.cwd();

  // Build overrides from --simulate/--mock flags
  const overrides = buildOverrides(
    { simulate: options.simulate, mock: options.mock },
    flowSettings,
  );

  // Auto-load destination /dev envs for simulated/mocked destinations
  if (overrides.destinations) {
    const { loadDestinationEnvs } = await import('./env-loader.js');
    const envs = await loadDestinationEnvs(
      flowSettings.destinations ?? {},
      flowSettings.packages,
      configDir,
    );
    for (const [destId, env] of Object.entries(envs)) {
      if (overrides.destinations[destId] && env.push) {
        overrides.destinations[destId].env = env.push;
        if (env.simulation && env.simulation.length > 0) {
          overrides.destinations[destId].simulation = env.simulation;
        }
      }
    }
  }

  // Bundle to temp file
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
    configDir,
    cleanup: async () => {
      await fs.remove(tempDir).catch(() => {});
    },
  };
}
