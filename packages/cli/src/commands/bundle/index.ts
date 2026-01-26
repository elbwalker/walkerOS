/**
 * Bundle Command
 *
 * Supports both single-flow and multi-flow builds.
 */

import path from 'path';
import fs from 'fs-extra';
import { getPlatform } from '@walkeros/core';
import {
  createCommandLogger,
  createTimer,
  createSuccessOutput,
  createErrorOutput,
  getErrorMessage,
  resolveAsset,
} from '../../core/index.js';
import {
  loadJsonConfig,
  loadBundleConfig,
  loadAllFlows,
  type LoadConfigResult,
} from '../../config/index.js';
import type { BuildOptions } from '../../types/bundle.js';
import { bundleCore } from './bundler.js';
import { displayStats, createStatsSummary } from './stats.js';

export interface BundleCommandOptions {
  config: string;
  flow?: string;
  all?: boolean;
  stats?: boolean;
  json?: boolean;
  cache?: boolean;
  verbose?: boolean;
  silent?: boolean;
  dockerfile?: boolean | string;
}

export async function bundleCommand(
  options: BundleCommandOptions,
): Promise<void> {
  const timer = createTimer();
  timer.start();

  const logger = createCommandLogger(options);

  try {
    // Validate flag combination
    if (options.flow && options.all) {
      throw new Error('Cannot use both --flow and --all flags together');
    }

    // Step 1: Read configuration file
    // Resolve bare names to examples directory, keep paths/URLs as-is
    const configPath = resolveAsset(options.config, 'config');
    const rawConfig = await loadJsonConfig(configPath);

    // Step 2: Load configuration(s) based on flags
    const configsToBundle: LoadConfigResult[] = options.all
      ? loadAllFlows(rawConfig, { configPath, logger })
      : [
          loadBundleConfig(rawConfig, {
            configPath,
            flowName: options.flow,
            logger,
          }),
        ];

    // Step 3: Bundle each configuration
    const results: Array<{
      flowName: string;
      success: boolean;
      stats?: unknown;
      error?: string;
    }> = [];

    for (const {
      flowConfig,
      buildOptions,
      flowName,
      isMultiFlow,
    } of configsToBundle) {
      try {
        // Override cache setting from CLI if provided
        if (options.cache !== undefined) {
          buildOptions.cache = options.cache;
        }

        // Log flow being built
        const configBasename = path.basename(configPath);
        if (isMultiFlow || options.all) {
          logger.log(`Bundling ${configBasename} (flow: ${flowName})...`);
        } else {
          logger.log(`Bundling ${configBasename}...`);
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
          flowName,
          success: true,
          stats,
        });

        // Show stats if requested (for non-JSON, non-multi builds)
        if (!options.json && !options.all && options.stats && stats) {
          displayStats(stats, logger);
        }

        // Generate Dockerfile if requested
        if (options.dockerfile && !options.all) {
          const platform = getPlatform(flowConfig);
          if (platform) {
            const outputDir = path.dirname(buildOptions.output);
            const customFile =
              typeof options.dockerfile === 'string'
                ? options.dockerfile
                : undefined;
            await generateDockerfile(outputDir, platform, logger, customFile);
          }
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        results.push({
          flowName,
          success: false,
          error: errorMessage,
        });

        if (!options.all) {
          throw error; // Re-throw for single flow builds
        }
      }
    }

    // Step 4: Report results
    const duration = timer.end() / 1000;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (options.json) {
      // JSON output for CI/CD
      const output =
        failureCount === 0
          ? createSuccessOutput(
              {
                flows: results,
                summary: {
                  total: results.length,
                  success: successCount,
                  failed: failureCount,
                },
              },
              duration,
            )
          : createErrorOutput(
              `${failureCount} flow(s) failed to build`,
              duration,
            );
      logger.json(output);
    } else {
      if (options.all) {
        logger.log(
          `\nBuild Summary: ${successCount}/${results.length} succeeded`,
        );
        if (failureCount > 0) {
          logger.error(`Failed: ${failureCount}`);
        }
      }

      if (failureCount > 0) {
        throw new Error(`${failureCount} flow(s) failed to build`);
      }
    }

    // Explicitly exit on success to avoid hanging from open handles
    // (pacote HTTP connections, esbuild workers, etc.)
    process.exit(0);
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      // JSON error output for CI/CD
      const output = createErrorOutput(errorMessage, duration);
      logger.json(output);
    } else {
      logger.error(`Error: ${errorMessage}`);
    }
    process.exit(1);
  }
}

/**
 * High-level bundle function for programmatic usage.
 *
 * Handles configuration loading, parsing, and logger creation internally.
 *
 * @param configOrPath - Bundle configuration (Flow.Setup) or path to config file
 * @param options - Bundle options
 * @param options.silent - Suppress all output (default: false)
 * @param options.verbose - Enable verbose logging (default: false)
 * @param options.stats - Collect and return bundle statistics (default: false)
 * @param options.cache - Enable package caching (default: true)
 * @param options.flowName - Flow to use (required for multi-flow configs)
 * @returns Bundle statistics if stats option is true, otherwise void
 *
 * @example
 * ```typescript
 * // With Flow.Setup config object
 * await bundle({
 *   version: 1,
 *   flows: {
 *     default: {
 *       web: {},
 *       packages: { '@walkeros/collector': { imports: ['startFlow'] } },
 *       destinations: { api: { code: 'destinationApi' } },
 *     }
 *   }
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
    flowName?: string;
    buildOverrides?: Partial<BuildOptions>;
  } = {},
): Promise<import('./bundler').BundleStats | void> {
  // 1. Load config if path provided
  let rawConfig: unknown;
  // Use current working directory as base when config is passed as object
  let configPath = path.resolve(process.cwd(), 'walkeros.config.json');
  if (typeof configOrPath === 'string') {
    // Resolve bare names to examples directory, keep paths as-is
    configPath = resolveAsset(configOrPath, 'config');
    rawConfig = await loadJsonConfig(configPath);
  } else {
    rawConfig = configOrPath;
  }

  // 2. Load and resolve config using Flow.Setup format
  const { flowConfig, buildOptions } = loadBundleConfig(rawConfig, {
    configPath,
    flowName: options.flowName,
    buildOverrides: options.buildOverrides,
  });

  // 3. Handle cache option
  if (options.cache !== undefined) {
    buildOptions.cache = options.cache;
  }

  // 4. Create logger internally
  const logger = createCommandLogger(options);

  // 5. Call core bundler
  return await bundleCore(
    flowConfig,
    buildOptions,
    logger,
    options.stats ?? false,
  );
}

/**
 * Generate or copy a Dockerfile for the bundled flow.
 *
 * Two modes:
 * - Generate mode: Creates a Dockerfile based on platform (web/server)
 * - Copy mode: Copies a custom Dockerfile if provided and exists
 *
 * @param outputDir - Directory to write the Dockerfile (dist/)
 * @param platform - Platform type ('web' or 'server')
 * @param logger - Logger instance for output
 * @param customFile - Optional path to custom Dockerfile to copy
 */
async function generateDockerfile(
  outputDir: string,
  platform: 'web' | 'server',
  logger: ReturnType<typeof createCommandLogger>,
  customFile?: string,
): Promise<void> {
  const destPath = path.join(outputDir, 'Dockerfile');

  // Copy mode: use custom file if it exists
  if (customFile && (await fs.pathExists(customFile))) {
    await fs.copy(customFile, destPath);
    logger.log(`Dockerfile: ${destPath} (copied from ${customFile})`);
    return;
  }

  // Generate mode: create based on platform
  const isWeb = platform === 'web';
  const bundleFile = isWeb ? 'walker.js' : 'bundle.mjs';
  const mode = isWeb ? 'serve' : 'collect';

  const dockerfile = `# Generated by walkeros CLI
FROM walkeros/flow:latest

COPY ${bundleFile} /app/flow/${bundleFile}

ENV MODE=${mode}
ENV BUNDLE=/app/flow/${bundleFile}

EXPOSE 8080
`;

  await fs.writeFile(destPath, dockerfile);
  logger.log(`Dockerfile: ${destPath}`);
}
