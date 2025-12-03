/**
 * CLI Startup Banner Utility
 *
 * Displays version information at CLI startup.
 * Respects --json and --silent flags via logger.
 */

import { VERSION as DOCKER_VERSION } from '@walkeros/docker';
import type { Logger } from './logger.js';

// Version injected at build time via tsup define
declare const __VERSION__: string;
const CLI_VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0';

/**
 * Display CLI startup banner with version information
 *
 * Banner is shown at the start of CLI commands to help users
 * identify which versions they're running.
 *
 * @param logger - Logger instance (must respect json/silent flags)
 */
export function displayStartupBanner(logger: Logger): void {
  logger.info(`🚀 walkerOS CLI v${CLI_VERSION}`);
  logger.info(`🐳 Using Docker runtime: walkeros/docker:${DOCKER_VERSION}`);
}

/**
 * Get CLI version
 */
export function getCliVersion(): string {
  return CLI_VERSION;
}

/**
 * Get Docker runtime version
 */
export function getDockerVersion(): string {
  return DOCKER_VERSION;
}
