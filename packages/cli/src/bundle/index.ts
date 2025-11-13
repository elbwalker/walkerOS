/**
 * Bundle Command
 *
 * Supports both single-environment and multi-environment builds.
 */

import path from 'path';
import {
  loadJsonConfig,
  createLogger,
  createTimer,
  createSuccessOutput,
  createErrorOutput,
} from '../core';
import {
  loadBundleConfig,
  loadAllEnvironments,
  type LoadConfigResult,
} from './config-loader';
import { bundle } from './bundler';
import { displayStats, createStatsSummary } from './stats';

export interface BundleCommandOptions {
  config: string;
  env?: string;
  all?: boolean;
  stats?: boolean;
  json?: boolean;
  cache?: boolean;
  verbose?: boolean;
}

export async function bundleCommand(
  options: BundleCommandOptions,
): Promise<void> {
  const timer = createTimer();
  timer.start();

  const logger = createLogger({
    verbose: options.verbose,
    silent: false,
    json: options.json,
  });

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

    for (const { config, environment, isMultiEnvironment } of configsToBundle) {
      try {
        // Override cache setting from CLI if provided
        if (options.cache !== undefined) {
          config.cache = options.cache;
        }

        // Log environment being built (for multi-environment setups)
        if (isMultiEnvironment || options.all) {
          logger.info(`\n🔧 Building environment: ${environment}`);
        } else {
          logger.info('🔧 Starting bundle process...');
        }

        // Run bundler
        const shouldCollectStats = options.stats || options.json;
        const stats = await bundle(config, logger, shouldCollectStats);

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
        logger.success(`\n✅ Bundle created successfully in ${timer.format()}`);
      } else {
        throw new Error(`${failureCount} environment(s) failed to build`);
      }
    }
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = error instanceof Error ? error.message : String(error);

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
}
