/**
 * Run Command
 *
 * Runs walkerOS flows using local runtime
 */

import path from 'path';
import { createRequire } from 'module';
import { createCLILogger } from '../../core/cli-logger.js';
import { createTimer, getErrorMessage } from '../../core/index.js';
import { validateFlowFile, validatePort } from './validators.js';
import { prepareBundleForRun, isPreBuiltConfig } from './utils.js';
import { executeRunLocal } from './execution.js';
import type { RunCommandOptions, RunOptions, RunResult } from './types.js';

const esmRequire = createRequire(import.meta.url);

/**
 * CLI command function for `walkeros run`
 *
 * @param options - Command options
 */
export async function runCommand(options: RunCommandOptions): Promise<void> {
  const timer = createTimer();
  timer.start();

  const logger = createCLILogger(options);

  try {
    // Step 1: Validate inputs
    const configPath = validateFlowFile(options.config);

    if (options.port !== undefined) {
      validatePort(options.port);
    }

    // Step 1b: Pre-flight check for server runtime dependencies
    const runtimeDeps = ['express', 'cors'];
    for (const dep of runtimeDeps) {
      try {
        esmRequire.resolve(dep);
      } catch {
        logger.error(
          `Missing runtime dependency "${dep}"\n` +
            `Server flows require express and cors when running outside Docker.\n` +
            `Run: npm install express cors`,
        );
        process.exit(1);
      }
    }

    // Step 2: Determine if config is pre-built or needs bundling
    const isPreBuilt = isPreBuiltConfig(configPath);

    let flowPath: string;

    if (isPreBuilt) {
      // Use pre-built bundle directly
      flowPath = path.resolve(configPath);
      logger.debug(`Using pre-built flow: ${path.basename(flowPath)}`);
    } else {
      // Bundle JSON config first
      logger.debug('Building flow bundle');

      flowPath = await prepareBundleForRun(configPath, {
        verbose: options.verbose,
        silent: options.json || options.silent,
      });

      logger.debug('Bundle ready');
    }

    // Step 3: Start heartbeat if deployment is specified
    if (options.deployment) {
      const { startHeartbeat } = await import('./heartbeat.js');
      await startHeartbeat({
        deployment: options.deployment,
        projectId: options.project,
        url: options.url || `http://localhost:${options.port || 8080}`,
        healthEndpoint: options.healthEndpoint,
        heartbeatInterval: options.heartbeatInterval,
      });
    }

    // Step 4: Execute locally using runtime module
    logger.info('Starting flow...');

    await executeRunLocal(flowPath, {
      port: options.port,
      host: options.host,
    });

    // Note: Server runs forever, so we won't reach here unless it fails
  } catch (error) {
    const duration = timer.getElapsed() / 1000;
    const errorMessage = getErrorMessage(error);

    if (options.json) {
      logger.json({
        success: false,
        error: errorMessage,
        duration,
      });
    } else {
      logger.error(`Error: ${errorMessage}`);
    }
    process.exit(1);
  }
}

/**
 * Programmatic run function
 *
 * @param options - Run options
 * @returns Run result
 *
 * @example
 * ```typescript
 * // Run with JSON config (bundles automatically)
 * await run({
 *   config: './flow.json',
 *   port: 8080
 * });
 *
 * // Run with pre-built bundle
 * await run({
 *   config: './flow.mjs',
 *   port: 8080
 * });
 * ```
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const startTime = Date.now();

  try {
    let flowFile: string;
    if (typeof options.config === 'string') {
      flowFile = validateFlowFile(options.config);
    } else {
      throw new Error('Programmatic run() requires config file path');
    }

    if (options.port !== undefined) {
      validatePort(options.port);
    }

    // Pre-flight check for server runtime dependencies
    const runtimeDeps = ['express', 'cors'];
    for (const dep of runtimeDeps) {
      try {
        esmRequire.resolve(dep);
      } catch {
        throw new Error(
          `Missing runtime dependency "${dep}". ` +
            `Server flows require express and cors when running outside Docker. ` +
            `Run: npm install express cors`,
        );
      }
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
    await executeRunLocal(flowPath, {
      port: options.port,
      host: options.host,
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
export type { RunCommandOptions, RunOptions, RunResult };
