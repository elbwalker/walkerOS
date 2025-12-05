#!/usr/bin/env node

import { createLogger, Level } from '@walkeros/core';
import type { Logger } from '@walkeros/core';
import { runFlow } from './services/runner';
import { runServeMode } from './services/serve';
import { VERSION } from './version';

// Re-export version for external consumers
export { VERSION } from './version';

// Create logger - DEBUG level when VERBOSE, otherwise INFO
const logLevel = process.env.VERBOSE === 'true' ? Level.DEBUG : Level.INFO;
const logger = createLogger({ level: logLevel });

/**
 * walkerOS Docker Container
 *
 * Pure runtime container for executing pre-built flows.
 * Supports two operational modes:
 * - collect: Run event collection server from pre-built flow
 * - serve: Serve static files
 */

async function main() {
  // Get operational mode from environment
  const mode = process.env.MODE;

  if (!mode) {
    logger.error('MODE environment variable required');
    logger.info('Valid modes: collect | serve');
    logger.info('Example: MODE=collect FLOW=/app/flow.mjs');
    process.exit(1);
  }

  if (!['collect', 'serve'].includes(mode)) {
    logger.error(`Invalid MODE="${mode}"`);
    logger.info('Valid modes: collect | serve');
    logger.info('Note: Build flows with @walkeros/cli first');
    process.exit(1);
  }

  // Display banner (always shown, not through logger)
  console.log('╔════════════════════════════════════════╗');
  console.log('║      walkerOS Docker Container         ║');
  console.log(`║              v${VERSION.padStart(6)}                   ║`);
  console.log('╚════════════════════════════════════════╝\n');
  logger.info(`Mode: ${mode.toUpperCase()}`);

  try {
    // Run the appropriate mode
    switch (mode) {
      case 'collect': {
        const flowPath = process.env.FLOW;

        if (!flowPath) {
          logger.throw(
            'FLOW environment variable required. Example: FLOW=/app/flow.mjs',
          );
          return; // TypeScript narrowing (never reached)
        }

        // Extract port from environment if set
        const port = process.env.PORT
          ? parseInt(process.env.PORT, 10)
          : undefined;
        const host = process.env.HOST;

        await runFlow(flowPath, { port, host }, logger.scope('runner'));
        break;
      }

      case 'serve': {
        // Serve mode uses minimal config from environment variables
        const config = {
          port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
          host: process.env.HOST || '0.0.0.0',
          staticDir: process.env.STATIC_DIR || '/app/dist',
        };

        await runServeMode(config, logger.scope('serve'));
        break;
      }

      default:
        logger.throw(`Unhandled mode: ${mode}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Fatal error: ${message}`);
    if (error instanceof Error && error.stack) {
      logger.debug('Stack trace:', { stack: error.stack });
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.debug('Stack trace:', { stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled rejection: ${message}`);
  if (reason instanceof Error && reason.stack) {
    logger.debug('Stack trace:', { stack: reason.stack });
  }
  process.exit(1);
});

// Export functions for CLI usage
export { runFlow, type RuntimeConfig } from './services/runner';
export { runServeMode, type ServeConfig } from './services/serve';

// Run main only when executed directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
