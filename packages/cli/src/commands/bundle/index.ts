/**
 * Bundle Command
 *
 * Supports both single-flow and multi-flow builds.
 */

import path from 'path';
import fs from 'fs-extra';
import { getPlatform } from '@walkeros/core';
import { createCLILogger } from '../../core/cli-logger.js';
import {
  createTimer,
  createSuccessOutput,
  createErrorOutput,
  getErrorMessage,
  resolveAsset,
  getTmpPath,
  isStdinPiped,
  readStdin,
  writeResult,
} from '../../core/index.js';
import {
  loadJsonConfig,
  loadBundleConfig,
  loadAllFlows,
  type LoadConfigResult,
} from '../../config/index.js';
import { isUrl } from '../../config/utils.js';
import type { BuildOptions } from '../../types/bundle.js';
import { bundleCore } from './bundler.js';
import type { BundleTarget } from './targets.js';
import { resolveTarget } from './targets.js';
import { uploadBundleToUrl, sanitizeUrl } from './upload.js';
import { displayStats, createStatsSummary } from './stats.js';
import { generateDockerfile } from './dockerfile.js';

export interface BundleCommandOptions {
  config?: string;
  output?: string;
  flow?: string;
  all?: boolean;
  stats?: boolean;
  json?: boolean;
  cache?: boolean;
  verbose?: boolean;
  silent?: boolean;
  dockerfile?: boolean | string;
}

/**
 * Resolve -o path: if directory, use platform-default filename.
 */
function resolveOutputPath(output: string, buildOptions: BuildOptions): string {
  const resolved = path.resolve(output);
  const ext = path.extname(resolved);
  if (output.endsWith('/') || output.endsWith(path.sep) || !ext) {
    const filename =
      buildOptions.platform === 'browser' ? 'walker.js' : 'bundle.mjs';
    return path.join(resolved, filename);
  }
  return resolved;
}

export async function bundleCommand(
  options: BundleCommandOptions,
): Promise<void> {
  const timer = createTimer();
  timer.start();

  // When writing to stdout, redirect all logs to stderr
  const writingToStdout = !options.output;
  const logger = createCLILogger({
    ...options,
    stderr: writingToStdout,
  });

  try {
    // Validate flag combinations
    if (options.flow && options.all) {
      throw new Error('Cannot use both --flow and --all flags together');
    }
    if (options.all && writingToStdout) {
      throw new Error(
        'Cannot use --all without --output (multiple bundles need file output)',
      );
    }

    // Step 1: Load config — from stdin or file
    let rawConfig: unknown;
    let configPath: string;

    if (isStdinPiped() && !options.config) {
      const stdinContent = await readStdin();
      try {
        rawConfig = JSON.parse(stdinContent);
      } catch {
        throw new Error('Invalid JSON received on stdin');
      }
      configPath = path.resolve(process.cwd(), 'stdin.config.json');
    } else {
      const file = options.config || 'bundle.config.json';
      configPath = resolveAsset(file, 'config');
      rawConfig = await loadJsonConfig(configPath);
    }

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
      flowSettings,
      buildOptions,
      flowName,
      isMultiFlow,
    } of configsToBundle) {
      try {
        // Override cache setting from CLI if provided
        if (options.cache !== undefined) {
          buildOptions.cache = options.cache;
        }

        // Resolve output path
        const outputIsUrl = options.output ? isUrl(options.output) : false;
        const uploadUrl = outputIsUrl ? options.output : undefined;

        if (outputIsUrl) {
          // URL output: bundle to temp file, upload after
          const ext = buildOptions.platform === 'browser' ? '.js' : '.mjs';
          buildOptions.output = getTmpPath(
            undefined,
            `url-bundle-${Date.now()}${ext}`,
          );
        } else if (options.output) {
          buildOptions.output = resolveOutputPath(options.output, buildOptions);
        } else {
          // Stdout mode: bundle to temp file, then write to stdout
          const ext = buildOptions.platform === 'browser' ? '.js' : '.mjs';
          buildOptions.output = getTmpPath(undefined, 'stdout-bundle' + ext);
        }

        // Log flow being built
        if (isMultiFlow || options.all) {
          logger.info(`Bundling flow: ${flowName}...`);
        } else {
          logger.info('Bundling...');
        }

        // Run bundler
        const shouldCollectStats = options.stats || options.json;
        const stats = await bundleCore(
          flowSettings,
          buildOptions,
          logger,
          shouldCollectStats,
        );

        results.push({ flowName, success: true, stats });

        // Upload to URL if output was a presigned URL
        if (uploadUrl) {
          await uploadBundleToUrl(buildOptions.output, uploadUrl);
          logger.info(`Uploaded to: ${sanitizeUrl(uploadUrl)}`);
          await fs.remove(buildOptions.output);
        }

        // Show stats if requested (for non-JSON, non-multi builds)
        if (!options.json && !options.all && options.stats && stats) {
          displayStats(stats, logger);
        }

        // Write bundle content to stdout if no -o and not --json
        // (--json writes JSON metadata to stdout instead)
        if (writingToStdout && !options.json) {
          const bundleContent = await fs.readFile(buildOptions.output);
          await writeResult(bundleContent, {});

          // Hint for interactive terminals
          if (process.stdout.isTTY) {
            const defaultPath =
              buildOptions.platform === 'browser'
                ? './dist/walker.js'
                : './dist/bundle.mjs';
            logger.info(
              `Bundle written to stdout. Use -o ${defaultPath} to write to file.`,
            );
          }
        }

        // Dockerfile only with -o
        if (options.dockerfile && options.output) {
          const platform = getPlatform(flowSettings);
          if (platform) {
            const outputDir = path.dirname(buildOptions.output);
            const customFile =
              typeof options.dockerfile === 'string'
                ? options.dockerfile
                : undefined;
            await generateDockerfile(
              outputDir,
              platform,
              logger,
              customFile,
              buildOptions.include,
            );
          }
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        results.push({ flowName, success: false, error: errorMessage });

        if (!options.all) {
          throw error;
        }
      }
    }

    // Step 4: Report results
    const duration = timer.end();
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (options.json) {
      const jsonResult =
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
      // JSON metadata is the result — write to stdout directly
      await writeResult(JSON.stringify(jsonResult, null, 2) + '\n', {
        output: options.output,
      });
    } else {
      if (options.all) {
        logger.info(
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

    process.exit(0);
  } catch (error) {
    const duration = timer.getElapsed();
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      const jsonError = createErrorOutput(errorMessage, duration);
      await writeResult(JSON.stringify(jsonError, null, 2) + '\n', {
        output: options.output,
      });
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
 * @param configOrPath - Bundle configuration (Flow.Json) or path to config file
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
 * // With Flow.Json config object
 * await bundle({
 *   version: 4,
 *   flows: {
 *     default: {
 *       config: {
 *         platform: 'web',
 *         bundle: { packages: { '@walkeros/collector': { imports: ['startFlow'] } } },
 *       },
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
    /**
     * Named bundle target. If omitted, falls back to
     * `buildOverrides.skipWrapper` mapping (deprecated) or `'cdn'`.
     */
    target?: BundleTarget;
    buildOverrides?: Partial<BuildOptions>;
  } = {},
): Promise<import('./bundler').BundleStats | void> {
  // Resolve effective target: explicit target > legacy skipWrapper mapping > default 'cdn'.
  let effectiveTarget: BundleTarget;
  if (options.target) {
    effectiveTarget = options.target;
  } else if (options.buildOverrides?.skipWrapper === true) {
    // Conservative mapping: preserves /dev inclusion for existing callers that
    // historically used skipWrapper to get schemas (push/simulate shape).
    effectiveTarget = 'simulate';
  } else {
    effectiveTarget = 'cdn';
  }

  const preset = resolveTarget(effectiveTarget);

  // Deprecation warning for legacy skipWrapper usage without explicit target.
  if (
    options.buildOverrides?.skipWrapper !== undefined &&
    !options.target &&
    process.env.WALKEROS_SUPPRESS_DEPRECATIONS !== '1'
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      '[@walkeros/cli] buildOverrides.skipWrapper is deprecated. ' +
        "Pass `target: 'cdn' | 'cdn-skeleton' | 'runner' | 'simulate' | 'push'` instead. " +
        'Set WALKEROS_SUPPRESS_DEPRECATIONS=1 to silence this warning.',
    );
  }

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

  // 2. Load and resolve config using Flow.Json format.
  // Merge target-derived flags into buildOverrides so loadBundleConfig sees them.
  const mergedOverrides: Partial<BuildOptions> = {
    ...(options.buildOverrides ?? {}),
    skipWrapper: preset.skipWrapper,
    withDev: preset.withDev,
  };
  const { flowSettings, buildOptions } = loadBundleConfig(rawConfig, {
    configPath,
    flowName: options.flowName,
    buildOverrides: mergedOverrides,
  });

  // 3. Handle cache option
  if (options.cache !== undefined) {
    buildOptions.cache = options.cache;
  }

  // 4. Create logger internally
  const logger = createCLILogger(options);

  // 5. Call core bundler
  return await bundleCore(
    flowSettings,
    buildOptions,
    logger,
    options.stats ?? false,
  );
}
