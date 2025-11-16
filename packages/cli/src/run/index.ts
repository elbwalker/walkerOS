/**
 * Run Command
 *
 * Runs walkerOS flows using @walkeros/docker as a library
 * No Docker daemon required - runs directly in Node.js
 */

import path from 'path';
import os from 'os';
import {
  runFlow,
  runServeMode,
  type RuntimeConfig,
  type ServeConfig,
} from '@walkeros/docker';
import { bundle } from '../bundle';
import { createLogger, createTimer, loadJsonConfig } from '../core';
import { validateMode, validateFlowFile, validatePort } from './validators';
import type {
  RunMode,
  RunCommandOptions,
  RunOptions,
  RunResult,
} from './types';

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

  const logger = createLogger({
    verbose: options.verbose,
    silent: false,
    json: options.json,
  });

  try {
    // Step 1: Validate inputs
    validateMode(mode);
    const configPath = validateFlowFile(options.config);

    if (options.port !== undefined) {
      validatePort(options.port);
    }

    // Step 2: Determine if config is pre-built or needs bundling
    const isPreBuilt =
      configPath.endsWith('.mjs') ||
      configPath.endsWith('.js') ||
      configPath.endsWith('.cjs');

    let flowPath: string;

    if (isPreBuilt) {
      // Use pre-built bundle directly
      flowPath = path.resolve(configPath);
      if (!options.json) {
        logger.info(`📦 Using pre-built flow: ${path.basename(flowPath)}`);
      }
    } else {
      // Bundle JSON config first
      if (!options.json) {
        logger.info('🔨 Building flow bundle...');
      }

      // Read config and modify output path
      const rawConfig = await loadJsonConfig(configPath);
      const tempPath = path.join(
        os.tmpdir(),
        `walkeros-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.mjs`,
      );

      // Ensure config has build.output set to temp path
      const existingBuild =
        typeof rawConfig === 'object' &&
        rawConfig !== null &&
        'build' in rawConfig &&
        typeof (rawConfig as Record<string, unknown>).build === 'object'
          ? ((rawConfig as Record<string, unknown>).build as Record<
              string,
              unknown
            >)
          : {};

      const configWithOutput = {
        ...(rawConfig as Record<string, unknown>),
        build: {
          ...existingBuild,
          output: tempPath,
        },
      };

      await bundle(configWithOutput, {
        cache: true,
        verbose: options.verbose,
        silent: options.json,
      });

      flowPath = tempPath;

      if (!options.json) {
        logger.success('✅ Bundle ready');
      }
    }

    // Step 3: Run the flow using Docker package
    if (!options.json) {
      const modeLabel = mode === 'collect' ? 'Collector' : 'Server';
      logger.info(`🚀 Starting ${modeLabel}...`);
    }

    switch (mode) {
      case 'collect': {
        const config: RuntimeConfig = {
          port: options.port,
          host: options.host,
        };
        await runFlow(flowPath, config);
        break;
      }

      case 'serve': {
        const config: ServeConfig = {
          port: options.port,
          host: options.host,
          staticDir: options.staticDir,
        };
        await runServeMode(config);
        break;
      }

      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    // Note: runFlow runs forever, so we won't reach here unless it fails
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = error instanceof Error ? error.message : String(error);

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
    const isPreBuilt =
      flowFile.endsWith('.mjs') ||
      flowFile.endsWith('.js') ||
      flowFile.endsWith('.cjs');

    let flowPath: string;

    if (isPreBuilt) {
      flowPath = path.resolve(flowFile);
    } else {
      // Bundle JSON config
      const rawConfig = await loadJsonConfig(flowFile);
      const tempPath = path.join(
        os.tmpdir(),
        `walkeros-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.mjs`,
      );

      // Ensure config has build.output set to temp path
      const existingBuild =
        typeof rawConfig === 'object' &&
        rawConfig !== null &&
        'build' in rawConfig &&
        typeof (rawConfig as Record<string, unknown>).build === 'object'
          ? ((rawConfig as Record<string, unknown>).build as Record<
              string,
              unknown
            >)
          : {};

      const configWithOutput = {
        ...(rawConfig as Record<string, unknown>),
        build: {
          ...existingBuild,
          output: tempPath,
        },
      };

      await bundle(configWithOutput, {
        cache: true,
        verbose: options.verbose,
        silent: true,
      });

      flowPath = tempPath;
    }

    // Run the flow using Docker package
    switch (mode) {
      case 'collect': {
        const config: RuntimeConfig = {
          port: options.port,
          host: options.host,
        };
        await runFlow(flowPath, config);
        break;
      }

      case 'serve': {
        const config: ServeConfig = {
          port: options.port,
          host: options.host,
          staticDir: options.staticDir,
        };
        await runServeMode(config);
        break;
      }

      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    // Success (though runFlow runs forever, so we typically don't reach here)
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
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export types
export type { RunMode, RunCommandOptions, RunOptions, RunResult };
