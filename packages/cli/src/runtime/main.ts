/**
 * Entry point for walkeros/flow Docker container
 * Reads environment variables and starts the appropriate mode
 */

import { runFlow } from './runner.js';
import { runServeMode } from './serve.js';
import { createLogger } from '../core/logger.js';
import type { Logger } from '@walkeros/core';

/**
 * Adapt CLI logger to core Logger.Instance interface
 */
function adaptLogger(
  cliLogger: ReturnType<typeof createLogger>,
): Logger.Instance {
  return {
    error: (message: string | Error) => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.error(msg);
    },
    info: (message: string | Error) => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.info(msg);
    },
    debug: (message: string | Error) => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.debug(msg);
    },
    throw: (message: string | Error): never => {
      const msg = message instanceof Error ? message.message : message;
      cliLogger.error(msg);
      throw message instanceof Error ? message : new Error(msg);
    },
    scope: (name: string) => {
      // Simple pass-through for scoped loggers - CLI logger doesn't use scopes
      return adaptLogger(cliLogger);
    },
  };
}

async function main() {
  const mode = process.env.MODE || 'collect';
  const file = process.env.FILE || '/flow/bundle.mjs';
  const port = parseInt(process.env.PORT || '8080', 10);

  const cliLogger = createLogger({ silent: false, verbose: true });
  const logger = adaptLogger(cliLogger);

  console.log(`Starting walkeros/flow in ${mode} mode`);
  console.log(`File: ${file}`);
  console.log(`Port: ${port}`);

  try {
    if (mode === 'collect') {
      await runFlow(file, { port }, logger);
    } else if (mode === 'serve') {
      await runServeMode({ file, port }, logger);
    } else {
      console.error(`Unknown mode: ${mode}. Use 'collect' or 'serve'.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

main();
