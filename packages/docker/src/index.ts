#!/usr/bin/env node

import { loadDockerConfig, parseDockerConfig } from './config';
import { registerSource, registerDestination } from './config/registry';
import { sourceExpress } from './sources/express';
import { destinationConsole } from './destinations/console';
import { runBundleMode } from './services/bundle';
import { runCollectMode } from './services/collect';
import { runServeMode } from './services/serve';

/**
 * walkerOS Docker Container
 *
 * Supports three operational modes:
 * - bundle: Generate static JavaScript bundles
 * - collect: Run event collection server
 * - serve: Serve static files
 */

async function main() {
  // Get operational mode from environment
  const mode = process.env.MODE;

  if (!mode) {
    console.error('❌ Error: MODE environment variable required');
    console.error('   Valid modes: bundle | collect | serve');
    console.error('   Example: MODE=collect node dist/index.js');
    process.exit(1);
  }

  if (!['bundle', 'collect', 'serve'].includes(mode)) {
    console.error(`❌ Error: Invalid MODE="${mode}"`);
    console.error('   Valid modes: bundle | collect | serve');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════╗');
  console.log('║      walkerOS Docker Container         ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`Mode: ${mode.toUpperCase()}\n`);

  try {
    // Register Phase 1 built-in sources and destinations
    registerSource('sourceExpress', sourceExpress);
    registerDestination('destinationConsole', destinationConsole);

    // Run the appropriate mode
    switch (mode) {
      case 'bundle': {
        const config = await loadDockerConfig();
        await runBundleMode(config);
        break;
      }

      case 'collect': {
        const config = await loadDockerConfig();
        await runCollectMode(config);
        break;
      }

      case 'serve': {
        // Serve mode works without config (uses defaults + env vars)
        const config = process.env.FLOW
          ? await loadDockerConfig()
          : {
              flow: { platform: 'web' as const },
              build: {},
              docker: parseDockerConfig({}),
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

// Run main
main();
