import type { Logger as CoreLogger } from '@walkeros/core';
import type { Logger } from './logger.js';

/**
 * Create collector logger config that forwards to CLI logger
 *
 * This bridges the CLI logger with the collector's internal logger,
 * allowing collector logs (from destinations, sources, etc.) to be
 * displayed through the CLI's output system.
 *
 * @param cliLogger - The CLI logger instance
 * @param verbose - Whether verbose mode is enabled
 * @returns Logger config for the collector
 */
export function createCollectorLoggerConfig(
  cliLogger: Logger,
  verbose?: boolean,
): CoreLogger.Config {
  return {
    level: verbose ? 'DEBUG' : 'ERROR',
    handler: (level, message, context, scope) => {
      const scopePath = scope.length > 0 ? `[${scope.join(':')}] ` : '';
      const hasContext = Object.keys(context).length > 0;
      const contextStr = hasContext ? ` ${JSON.stringify(context)}` : '';

      if (level === 0) {
        // ERROR - always show
        cliLogger.error(`${scopePath}${message}${contextStr}`);
      } else if (verbose) {
        // INFO or DEBUG - only show if verbose
        cliLogger.debug(`${scopePath}${message}${contextStr}`);
      }
    },
  };
}
