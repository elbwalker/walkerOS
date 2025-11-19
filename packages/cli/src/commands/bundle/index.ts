/**
 * Bundle Command
 *
 * Supports both single-environment and multi-environment builds.
 */

import path from 'path';
import {
  createLogger,
  createTimer,
  createSuccessOutput,
  createErrorOutput,
  executeCommand,
} from '../../core';
import {
  loadJsonConfig,
  loadBundleConfig,
  loadAllEnvironments,
  parseBundleConfig,
  type LoadConfigResult,
} from '../../config';
import type { GlobalOptions } from '../../types';
import { bundleCore } from './bundler';
import { displayStats, createStatsSummary } from './stats';

export interface BundleCommandOptions extends GlobalOptions {
  config: string;
  env?: string;
  all?: boolean;
  stats?: boolean;
  json?: boolean;
  cache?: boolean;
}

export async function bundleCommand(
  options: BundleCommandOptions,
): Promise<void> {
  const timer = createTimer();
  timer.start();

  const logger = createLogger({
    verbose: options.verbose,
    silent: options.silent ?? false,
    json: options.json,
  });

  // Build Docker args - file path as first positional arg
  const dockerArgs = [options.config];
  if (options.env) dockerArgs.push('--env', options.env);
  if (options.all) dockerArgs.push('--all');
  if (options.stats) dockerArgs.push('--stats');
  if (options.json) dockerArgs.push('--json');
  if (options.cache === false) dockerArgs.push('--no-cache');
  if (options.verbose) dockerArgs.push('--verbose');
  if (options.silent) dockerArgs.push('--silent');

  await executeCommand(
    async () => {
      try {
        // Validate flag combination
        if (options.env && options.all) {
          throw new Error('Cannot use both --env and --all flags together');
        }

        // Step 1: Read configuration file
        logger.info('📦 Reading configuration...');
        const configPath = path.resolve(options.config);
        const rawConfig = await loadJsonConfig(configPath);

        // Step 2: Load configuration(s) based on flags
        const configsToBundle: LoadConfigResult[] = options.all
          ? loadAllEnvironments(rawConfig, { configPath, logger })
          : [
              loadBundleConfig(rawConfig, {
                configPath,
                environment: options.env,
                logger,
              }),
            ];

        // Step 3: Bundle each configuration
        const results: Array<{
          environment: string;
          success: boolean;
          stats?: unknown;
          error?: string;
        }> = [];

        for (const {
          flowConfig,
          buildOptions,
          environment,
          isMultiEnvironment,
        } of configsToBundle) {
          try {
            // Override cache setting from CLI if provided
            if (options.cache !== undefined) {
              buildOptions.cache = options.cache;
            }

            // Log environment being built (for multi-environment setups)
            if (isMultiEnvironment || options.all) {
              logger.info(`\n🔧 Building environment: ${environment}`);
            } else {
              logger.info('🔧 Starting bundle process...');
            }

            // Run bundler
            const shouldCollectStats = options.stats || options.json;
            const stats = await bundleCore(
              flowConfig,
              buildOptions,
              logger,
              shouldCollectStats,
            );

            results.push({
              environment,
              success: true,
              stats,
            });

            // Show stats if requested (for non-JSON, non-multi builds)
            if (!options.json && !options.all && options.stats && stats) {
              displayStats(stats, logger);
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            results.push({
              environment,
              success: false,
              error: errorMessage,
            });

            if (!options.all) {
              throw error; // Re-throw for single environment builds
            }
          }
        }

        // Step 4: Report results
        const duration = timer.end() / 1000;
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        if (options.json) {
          // JSON output for CI/CD
          const outputLogger = createLogger({ silent: false, json: false });
          const output =
            failureCount === 0
              ? createSuccessOutput(
                  {
                    environments: results,
                    summary: {
                      total: results.length,
                      success: successCount,
                      failed: failureCount,
                    },
                  },
                  duration,
                )
              : createErrorOutput(
                  `${failureCount} environment(s) failed to build`,
                  duration,
                );
          outputLogger.log('white', JSON.stringify(output, null, 2));
        } else {
          if (options.all) {
            logger.info(`\n📊 Build Summary:`);
            logger.info(`   Total: ${results.length}`);
            logger.success(`   ✅ Success: ${successCount}`);
            if (failureCount > 0) {
              logger.error(`   ❌ Failed: ${failureCount}`);
            }
          }

          if (failureCount === 0) {
            logger.success(
              `\n✅ Bundle created successfully in ${timer.format()}`,
            );
          } else {
            throw new Error(`${failureCount} environment(s) failed to build`);
          }
        }
      } catch (error) {
        const duration = timer.getElapsed() / 1000;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (options.json) {
          // JSON error output for CI/CD
          const outputLogger = createLogger({ silent: false, json: false });
          const output = createErrorOutput(errorMessage, duration);
          outputLogger.log('white', JSON.stringify(output, null, 2));
        } else {
          logger.error('❌ Bundle failed:');
          logger.error(errorMessage);
        }
        process.exit(1);
      }
    },
    'bundle',
    dockerArgs,
    options,
    logger,
    options.config,
  );
}

/**
 * High-level bundle function for programmatic usage.
 *
 * Handles configuration loading, parsing, and logger creation internally.
 *
 * @param configOrPath - Bundle configuration object or path to config file
 * @param options - Bundle options
 * @param options.silent - Suppress all output (default: false)
 * @param options.verbose - Enable verbose logging (default: false)
 * @param options.stats - Collect and return bundle statistics (default: false)
 * @param options.cache - Enable package caching (default: true)
 * @returns Bundle statistics if stats option is true, otherwise void
 *
 * @example
 * ```typescript
 * // With config object
 * await bundle({
 *   platform: 'web',
 *   packages: { '@walkeros/collector': { imports: ['startFlow'] } },
 *   sources: { browser: { code: 'sourceBrowser' } },
 *   destinations: { api: { code: 'destinationApi' } },
 *   code: 'export default startFlow({ sources, destinations })',
 *   output: './dist/walker.js'
 * });
 *
 * // With config file
 * await bundle('./walker.config.json', { stats: true });
 * ```
 */
export async function bundle(
  configOrPath: unknown,
  options: {
    silent?: boolean;
    verbose?: boolean;
    stats?: boolean;
    cache?: boolean;
  } = {},
): Promise<import('./bundler').BundleStats | void> {
  // 1. Load config if path provided
  let rawConfig: unknown;
  if (typeof configOrPath === 'string') {
    rawConfig = await loadJsonConfig(configOrPath);
  } else {
    rawConfig = configOrPath;
  }

  // 2. Parse and normalize config
  const { flowConfig, buildOptions } = parseBundleConfig(rawConfig);

  // 3. Handle cache option
  if (options.cache !== undefined) {
    buildOptions.cache = options.cache;
  }

  // 4. Create logger internally
  const logger = createLogger({
    silent: options.silent ?? false,
    verbose: options.verbose ?? false,
  });

  // 5. Call core bundler
  return await bundleCore(
    flowConfig,
    buildOptions,
    logger,
    options.stats ?? false,
  );
}
