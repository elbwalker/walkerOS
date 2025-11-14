/**
 * Run Command
 *
 * Orchestrates Docker containers for walkerOS collectors and servers
 */

import { createLogger, createTimer } from '../core';
import {
  validateMode,
  validateFlowFile,
  validatePort,
  validateContainerName,
} from './validators';
import {
  checkDocker,
  pullImageIfNeeded,
  isContainerRunning,
  removeContainer,
} from './docker-manager';
import { spawnContainer, formatResult } from './orchestrator';
import type {
  RunMode,
  RunCommandOptions,
  RunOptions,
  RunResult,
  DockerRunConfig,
} from './types';

/**
 * Default Docker image
 */
const DEFAULT_IMAGE = 'walkeros/docker:latest';

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
    const flowFile = validateFlowFile(options.config);

    if (options.port !== undefined) {
      validatePort(options.port);
    }

    if (options.name) {
      validateContainerName(options.name);
    }

    // Step 2: Check Docker availability
    if (!options.json) {
      logger.info('🐳 Checking Docker...');
    }

    const dockerCheck = checkDocker();
    if (!dockerCheck.running) {
      throw new Error(dockerCheck.error || 'Docker is not available');
    }

    // Step 3: Check for name conflicts
    if (options.name && isContainerRunning(options.name)) {
      throw new Error(
        `Container with name "${options.name}" is already running\n` +
          `   Stop it first: docker stop ${options.name}\n` +
          `   Or choose a different name: --name my-collector`,
      );
    }

    // Step 4: Pull Docker image
    const image = options.image || DEFAULT_IMAGE;
    if (!options.noPull) {
      if (!options.json) {
        logger.info(`📥 Checking Docker image: ${image}`);
      }
      await pullImageIfNeeded(image, options.verbose);
    }

    // Step 5: Build run configuration
    const runConfig: DockerRunConfig = {
      mode: mode as RunMode,
      flowFile,
      port: options.port,
      host: options.host,
      detach: options.detach,
      name: options.name,
      image,
    };

    // Step 6: Start container
    if (!options.json) {
      const modeLabel = mode === 'collect' ? 'collector' : 'server';
      logger.info(`🚀 Starting ${modeLabel}...`);
    }

    const result = await spawnContainer(runConfig, options.verbose);

    // Step 7: Report results
    const duration = timer.end() / 1000;

    if (options.json) {
      // JSON output for CI/CD
      const output = {
        success: result.success,
        mode,
        exitCode: result.exitCode,
        containerId: result.containerId,
        duration,
        error: result.error,
      };
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(output, null, 2));
    } else {
      const message = formatResult(result, mode);
      if (result.success) {
        logger.success(message);
      } else {
        logger.error(message);
      }
    }

    // Exit with container's exit code
    if (!result.success) {
      process.exit(result.exitCode);
    }
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
 * const result = await run('collect', {
 *   config: './flow.json',
 *   port: 8080,
 *   detach: false
 * });
 * ```
 */
export async function run(
  mode: RunMode,
  options: RunOptions,
): Promise<RunResult> {
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

  if (options.name) {
    validateContainerName(options.name);
  }

  // Check Docker availability
  const dockerCheck = checkDocker();
  if (!dockerCheck.running) {
    throw new Error(dockerCheck.error || 'Docker is not available');
  }

  // Check for name conflicts
  if (options.name && isContainerRunning(options.name)) {
    // Clean up existing container if in detached mode
    if (options.detach) {
      removeContainer(options.name, true);
    } else {
      throw new Error(`Container "${options.name}" is already running`);
    }
  }

  // Pull image if needed
  const image = options.image || DEFAULT_IMAGE;
  if (!options.noPull) {
    await pullImageIfNeeded(image, options.verbose);
  }

  // Build run configuration
  const runConfig: DockerRunConfig = {
    mode,
    flowFile,
    port: options.port,
    host: options.host,
    detach: options.detach,
    name: options.name,
    image,
  };

  // Run container
  return await spawnContainer(runConfig, options.verbose);
}

// Export types
export type {
  RunMode,
  RunCommandOptions,
  RunOptions,
  RunResult,
  DockerRunConfig,
};
