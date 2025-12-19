/**
 * Run Command
 *
 * Runs walkerOS flows using local runtime
 */

import path from 'path';
import {
  createCommandLogger,
  createTimer,
  getErrorMessage,
} from '../../core/index.js';
import { validateMode, validateFlowFile, validatePort } from './validators.js';
import { prepareBundleForRun, isPreBuiltConfig } from './utils.js';
import { executeRunLocal } from './execution.js';
import type {
  RunMode,
  RunCommandOptions,
  RunOptions,
  RunResult,
} from './types.js';

/**
 * CLI command function for `walkeros run`
 *
 * @param mode - Run mode (collect | serve)
 * @param options - Command options
 */
export async function runCommand(
  mode: string,
  options: RunCommandOptions,
): Promise<void> {
  const timer = createTimer();
  timer.start();

  const logger = createCommandLogger(options);

  try {
    // Step 1: Validate inputs
    validateMode(mode);
    const configPath = validateFlowFile(options.config);

    if (options.port !== undefined) {
      validatePort(options.port);
    }

    // Step 2: Determine if config is pre-built or needs bundling
    const isPreBuilt = isPreBuiltConfig(configPath);

    let flowPath: string | null = null;

    if (mode === 'collect') {
      if (isPreBuilt) {
        // Use pre-built bundle directly
        flowPath = path.resolve(configPath);
        if (!options.json && !options.silent) {
          logger.info(`📦 Using pre-built flow: ${path.basename(flowPath)}`);
        }
      } else {
        // Bundle JSON config first
        if (!options.json && !options.silent) {
          logger.info('🔨 Building flow bundle...');
        }

        flowPath = await prepareBundleForRun(configPath, {
          verbose: options.verbose,
          silent: options.json || options.silent,
        });

        if (!options.json && !options.silent) {
          logger.success('✅ Bundle ready');
        }
      }
    }

    // Step 3: Execute locally
    // Handle dry-run
    if (options.dryRun) {
      logger.info(`[DRY-RUN] Would execute locally: run ${mode}`);
      return;
    }

    // Execute locally using runtime module
    if (!options.json && !options.silent) {
      const modeLabel = mode === 'collect' ? 'Collector' : 'Server';
      logger.info(`🖥️  Starting ${modeLabel} locally...`);
    }

    await executeRunLocal(mode as 'collect' | 'serve', flowPath, {
      port: options.port,
      host: options.host,
      serveName: options.serveName,
      servePath: options.servePath,
    });

    // Note: Server runs forever, so we won't reach here unless it fails
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      const output = {
        success: false,
        mode,
        error: errorMessage,
        duration,
      };
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(output, null, 2));
    } else {
      logger.error('❌ Run failed:');
      logger.error(errorMessage);
    }
    process.exit(1);
  }
}

/**
 * Programmatic run function
 *
 * @param mode - Run mode (collect | serve)
 * @param options - Run options
 * @returns Run result
 *
 * @example
 * ```typescript
 * // Run with JSON config (bundles automatically)
 * await run('collect', {
 *   config: './flow.json',
 *   port: 8080
 * });
 *
 * // Run with pre-built bundle
 * await run('collect', {
 *   config: './flow.mjs',
 *   port: 8080
 * });
 * ```
 */
export async function run(
  mode: RunMode,
  options: RunOptions,
): Promise<RunResult> {
  const startTime = Date.now();

  try {
    // Validate inputs
    validateMode(mode);

    let flowFile: string;
    if (typeof options.config === 'string') {
      flowFile = validateFlowFile(options.config);
    } else {
      throw new Error('Programmatic run() requires config file path');
    }

    if (options.port !== undefined) {
      validatePort(options.port);
    }

    // Determine if config is pre-built or needs bundling
    const isPreBuilt = isPreBuiltConfig(flowFile);

    let flowPath: string;

    if (isPreBuilt) {
      flowPath = path.resolve(flowFile);
    } else {
      // Bundle JSON config
      flowPath = await prepareBundleForRun(flowFile, {
        verbose: options.verbose,
        silent: true,
      });
    }

    // Run the flow using local runtime
    await executeRunLocal(mode, flowPath, {
      port: options.port,
      host: options.host,
      serveName: options.serveName,
      servePath: options.servePath,
    });

    // Success (though server runs forever, so we typically don't reach here)
    return {
      success: true,
      exitCode: 0,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  }
}

// Export types
export type { RunMode, RunCommandOptions, RunOptions, RunResult };
