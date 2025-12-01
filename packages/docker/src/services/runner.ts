/**
 * Pure runtime executor for pre-built walkerOS flows
 *
 * This module runs pre-built .mjs flow bundles without any build-time operations.
 * All bundling, package downloading, and code generation happens BEFORE this runs.
 */

import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';

export interface RuntimeConfig {
  port?: number;
  host?: string;
}

/**
 * Run a pre-built flow bundle
 *
 * @param flowPath - Absolute path to pre-built .mjs flow file
 * @param config - Optional runtime configuration
 */
export async function runFlow(
  flowPath: string,
  config?: RuntimeConfig,
): Promise<void> {
  console.log(`🚀 Loading flow from ${flowPath}`);

  try {
    const absolutePath = resolve(flowPath);
    const flowDir = dirname(absolutePath);

    // Change working directory to flow's directory
    // This ensures relative paths (e.g., ./shared/credentials.json) work
    // consistently in both local and Docker execution modes
    process.chdir(flowDir);

    const fileUrl = pathToFileURL(absolutePath).href;
    const module = await import(fileUrl);

    if (!module.default || typeof module.default !== 'function') {
      throw new Error(
        `Invalid flow bundle: ${flowPath} must export a default function`,
      );
    }

    // Execute the flow's factory function
    const result = await module.default(config);

    if (!result || !result.collector) {
      throw new Error(
        `Invalid flow bundle: ${flowPath} must return { collector }`,
      );
    }

    const { collector } = result;

    console.log('✅ Flow running');
    if (config?.port) {
      console.log(`   Port: ${config.port}`);
    }

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);

      try {
        // Use collector's shutdown command if available
        if (collector.command) {
          await collector.command('shutdown');
        }
        console.log('✅ Shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Failed to run flow:', error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    throw error;
  }
}
