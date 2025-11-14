import { bundle } from '@walkeros/cli';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import type { Config } from '../config/schema';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run collect mode - start event collection server
 *
 * Phase 2: Uses CLI's bundle() to generate executable bundle, then imports and runs it
 *
 * Architecture:
 * 1. CLI bundle() downloads packages, generates bundle.mjs (all logic in CLI)
 * 2. Docker imports the bundle
 * 3. Docker runs the bundle's exported factory function
 * 4. Collector runs forever with graceful shutdown
 *
 * This approach maintains strict separation of concerns:
 * - CLI handles all build-time operations (package management, bundling)
 * - Docker handles runtime orchestration (execute bundle, manage lifecycle)
 */
export async function runCollectMode(config: Config): Promise<void> {
  console.log('🚀 Collect mode: Starting event collector...');

  try {
    // Get config file path from environment
    const configFile = process.env.FLOW;
    if (!configFile) {
      throw new Error('FLOW environment variable required for collect mode');
    }

    // Setup persistent directory for bundle (won't be cleaned up)
    const PERSIST_DIR = process.env.BUNDLE_DIR
      ? path.resolve(process.env.BUNDLE_DIR)
      : path.resolve('.tmp', 'docker-collect');
    await fs.ensureDir(PERSIST_DIR);

    const bundlePath = path.join(PERSIST_DIR, 'collector-bundle.mjs');

    console.log('📦 Generating collector bundle...');
    console.log(`   Config: ${configFile}`);
    console.log(`   Output: ${bundlePath}`);

    // Load config and override output path
    const flowConfigContent = await fs.readFile(configFile, 'utf-8');
    const flowConfig = JSON.parse(flowConfigContent);

    // Override port from environment if set (for tests)
    if (process.env.PORT) {
      const port = parseInt(process.env.PORT);
      // Find HTTP source and update port
      if (flowConfig.flow?.sources) {
        for (const sourceKey of Object.keys(flowConfig.flow.sources)) {
          const source = flowConfig.flow.sources[sourceKey];
          if (source.config?.settings) {
            source.config.settings.port = port;
          }
        }
      }
    }

    // Set output in build section (NEW format)
    if (!flowConfig.build) flowConfig.build = {};
    flowConfig.build.output = bundlePath;

    // Set template path relative to Docker package (templates bundled with package)
    if (!flowConfig.build.template) {
      // Resolve from Docker package root
      const dockerRoot = path.resolve(__dirname, '..');
      flowConfig.build.template = path.join(dockerRoot, 'templates/base.hbs');
    }

    // For Docker collect mode, we need standalone bundles with all dependencies bundled
    // Use 'node' platform but with empty external to bundle everything
    flowConfig.build.platform = 'node';
    flowConfig.build.format = 'esm';
    flowConfig.build.external = [];

    // Use CLI's bundle function - it handles EVERYTHING:
    // - Downloads npm packages
    // - Resolves dependencies
    // - Generates executable code
    // - Creates bundle.mjs with factory function export
    await bundle(flowConfig, {
      cache: config.build.cache ?? true,
      verbose: process.env.DEBUG === 'true',
      silent: false,
    });

    console.log('📥 Loading collector from bundle...');

    // Copy downloaded packages from temp directory to Docker's node_modules
    // This is necessary because ESM imports don't respect NODE_PATH
    const tempNodeModules = flowConfig.build.tempDir
      ? path.join(flowConfig.build.tempDir, 'node_modules')
      : '/tmp/node_modules';
    const dockerNodeModules = path.join(process.cwd(), 'node_modules');

    // Copy ALL packages (not just @walkeros) to include dependencies
    if (await fs.pathExists(tempNodeModules)) {
      const items = await fs.readdir(tempNodeModules);

      for (const item of items) {
        const srcPath = path.join(tempNodeModules, item);
        const destPath = path.join(dockerNodeModules, item);

        // Check if it's a directory (package or scope)
        const stat = await fs.stat(srcPath);
        if (stat.isDirectory()) {
          // Copy the entire directory (package or @scope)
          await fs.copy(srcPath, destPath, { overwrite: true });
        }
      }
    }

    // Import the generated bundle (cache-bust with timestamp)
    const timestamp = Date.now();
    const module = await import(`file://${bundlePath}?t=${timestamp}`);

    // Execute the bundle's factory function
    // Bundle exports: export default async function() { ... return { collector, elb } }
    const { collector } = await module.default();

    console.log('✅ Collector running');
    console.log(
      `   Sources initialized: ${Object.keys(collector.sources).length}`,
    );
    console.log(
      `   Destinations initialized: ${Object.keys(collector.destinations).length}`,
    );

    // Graceful shutdown handler (25s timeout is standard)
    const shutdownHandler = async (signal: string) => {
      console.log(`\n⏹️  Received ${signal}, shutting down gracefully...`);

      // Give sources 25 seconds to finish processing
      setTimeout(() => {
        console.log('✅ Shutdown complete');
        process.exit(0);
      }, 25000);

      // Stop accepting new events
      await collector.command('shutdown');
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    // Keep process alive - sources handle everything
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Collector failed:', error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}
