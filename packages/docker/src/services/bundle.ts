import { bundleCommand } from '@walkeros/cli';
import type { Config } from '../config/schema';

/**
 * Run bundle mode - generate static JavaScript bundle
 *
 * Delegates to @walkeros/cli bundleCommand with zero duplication
 */
export async function runBundleMode(config: Config): Promise<void> {
  console.log('📦 Bundle mode: Generating static file...');
  console.log(`   Platform: ${config.flow.platform}`);
  console.log(`   Output: ${config.build.output}`);

  // Get config file path from environment (set by main entry point)
  const configFile = process.env.FLOW;
  if (!configFile) {
    throw new Error('FLOW environment variable required for bundle mode');
  }

  try {
    // Delegate to CLI - it handles everything
    await bundleCommand({
      config: configFile, // Pass config file path, not object
      cache: config.build.cache ?? true,
      stats: process.env.DEBUG === 'true',
      verbose: process.env.DEBUG === 'true',
    });

    console.log(`✅ Bundle created successfully: ${config.build.output}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Bundle failed:', error);
    process.exit(1);
  }
}
