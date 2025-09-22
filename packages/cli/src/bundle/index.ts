import path from 'path';
import {
  loadJsonConfig,
  createLogger,
  formatDuration,
  formatBytes,
  createJsonOutput,
  Logger,
} from '../core';
import { parseBundleConfig } from './config';
import { bundle, type BundleStats } from './bundler';

export interface BundleCommandOptions {
  config: string;
  stats?: boolean;
  json?: boolean;
  verbose?: boolean;
}

export async function bundleCommand(
  options: BundleCommandOptions,
): Promise<void> {
  const startTime = Date.now();
  const logger = createLogger({
    verbose: options.verbose,
    silent: false,
    json: options.json,
  });

  try {
    // Step 1: Read configuration file
    logger.info('📦 Reading configuration...');
    const configPath = path.resolve(options.config);
    const rawConfig = await loadJsonConfig(configPath);
    const config = parseBundleConfig(rawConfig);

    // Step 2: Run bundler
    const shouldCollectStats = options.stats || options.json;
    logger.info('🔧 Starting bundle process...');
    const stats = await bundle(config, logger, shouldCollectStats);

    // Step 3: Show stats if requested
    if (options.json && stats) {
      // JSON output for CI/CD
      const output = createJsonOutput(
        true,
        { stats },
        undefined,
        formatDuration(startTime),
      );
      console.log(JSON.stringify(output, null, 2));
    } else {
      if (options.stats && stats) {
        displayStats(stats, logger);
      }

      // Step 4: Success message
      const duration = formatDuration(startTime);
      logger.success(`✅ Bundle created successfully in ${duration}s`);
    }
  } catch (error) {
    if (options.json) {
      // JSON error output for CI/CD
      const output = createJsonOutput(
        false,
        undefined,
        error instanceof Error ? error.message : String(error),
        formatDuration(startTime),
      );
      console.log(JSON.stringify(output, null, 2));
    } else {
      logger.error('❌ Bundle failed:');
      logger.error(error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

function displayStats(stats: BundleStats, logger: Logger): void {
  console.log('\n📊 Bundle Statistics');
  console.log('─'.repeat(50));

  // Total size
  const sizeKB = formatBytes(stats.totalSize);
  console.log(`Total Size: ${sizeKB} KB`);

  // Build time
  const timeSeconds = (stats.buildTime / 1000).toFixed(2);
  console.log(`Build Time: ${timeSeconds}s`);

  // Tree-shaking effectiveness
  const treeshakingStatus = stats.treeshakingEffective
    ? '✅ Effective'
    : '⚠️  Not optimal (consider using named imports)';
  console.log(`Tree-shaking: ${treeshakingStatus}`);

  // Package breakdown
  if (stats.packages.length > 0) {
    console.log(`\nPackage Breakdown:`);
    stats.packages.forEach((pkg) => {
      if (pkg.size > 0) {
        const pkgSizeKB = formatBytes(pkg.size);
        console.log(`  • ${pkg.name}: ${pkgSizeKB} KB`);
      }
    });
  }

  console.log('─'.repeat(50));
}
