/**
 * Execution Mode Handler
 *
 * Determines whether to execute commands locally or in Docker.
 */

import type { GlobalOptions } from '../types/global';
import {
  executeInDocker,
  executeRunInDocker,
  isDockerAvailable,
} from './docker';
import type { Logger } from './logger';

/**
 * Execution mode
 */
export type ExecutionMode = 'local' | 'docker';

/**
 * Get execution mode from options
 *
 * @param options - Global options
 * @returns Execution mode
 */
export function getExecutionMode(options: GlobalOptions): ExecutionMode {
  return options.local ? 'local' : 'docker';
}

/**
 * Execute command handler type
 */
export type ExecuteHandler = () => Promise<void>;

/**
 * Execute command based on mode
 *
 * @param localHandler - Function to execute locally
 * @param dockerCommand - Docker command name
 * @param dockerArgs - Docker command arguments
 * @param options - Global options
 * @param logger - Logger instance
 * @param configFile - Optional config file path to mount in Docker
 */
export async function executeCommand(
  localHandler: ExecuteHandler,
  dockerCommand: string,
  dockerArgs: string[],
  options: GlobalOptions,
  logger?: Logger,
  configFile?: string,
): Promise<void> {
  const mode = getExecutionMode(options);

  // Handle dry-run
  if (options.dryRun) {
    if (mode === 'docker') {
      const cmd = `docker run walkeros/cli:latest ${dockerCommand} ${dockerArgs.join(' ')}`;
      logger?.info(`[DRY-RUN] Would execute: ${cmd}`);
    } else {
      logger?.info(
        `[DRY-RUN] Would execute locally: ${dockerCommand} ${dockerArgs.join(' ')}`,
      );
    }
    return;
  }

  // Execute based on mode
  if (mode === 'local') {
    if (logger && !options.silent) {
      logger.info('🖥️  Executing locally...');
    }
    await localHandler();
  } else {
    // Docker mode
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      throw new Error(
        'Docker is not available. Please install Docker or use --local flag to execute locally.',
      );
    }

    if (logger && !options.silent) {
      logger.info('🐳 Executing in Docker container...');
    }
    await executeInDocker(dockerCommand, dockerArgs, options, configFile);
  }
}
