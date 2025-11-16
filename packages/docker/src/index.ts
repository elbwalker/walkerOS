#!/usr/bin/env node

import { runFlow } from './services/runner';
import { runServeMode } from './services/serve';

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
    console.error('❌ Error: MODE environment variable required');
    console.error('   Valid modes: collect | serve');
    console.error('   Example: MODE=collect FLOW=/app/flow.mjs');
    process.exit(1);
  }

  if (!['collect', 'serve'].includes(mode)) {
    console.error(`❌ Error: Invalid MODE="${mode}"`);
    console.error('   Valid modes: collect | serve');
    console.error('   Note: Build flows with @walkeros/cli first');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════╗');
  console.log('║      walkerOS Docker Container         ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`Mode: ${mode.toUpperCase()}\n`);

  try {
    // Run the appropriate mode
    switch (mode) {
      case 'collect': {
        const flowPath = process.env.FLOW;

        if (!flowPath) {
          throw new Error(
            'FLOW environment variable required. ' +
              'Example: FLOW=/app/flow.mjs',
          );
        }

        // Extract port from environment if set
        const port = process.env.PORT
          ? parseInt(process.env.PORT, 10)
          : undefined;
        const host = process.env.HOST;

        await runFlow(flowPath, { port, host });
        break;
      }

      case 'serve': {
        // Serve mode uses minimal config from environment variables
        const config = {
          port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
          host: process.env.HOST || '0.0.0.0',
          staticDir: process.env.STATIC_DIR || '/app/dist',
        };

        await runServeMode(config);
        break;
      }

      default:
        throw new Error(`Unhandled mode: ${mode}`);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Export functions for CLI usage
export { runFlow, type RuntimeConfig } from './services/runner';
export { runServeMode, type ServeConfig } from './services/serve';

// Run main only when executed directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
