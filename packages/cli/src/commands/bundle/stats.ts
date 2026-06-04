/**
 * Bundle statistics display utilities
 */
import { formatBytes } from '../../core/index.js';
import type { BundleStats } from './bundler.js';
import type { Logger } from '@walkeros/core';

/**
 * Display detailed bundle statistics to console
 */
export function displayStats(
  stats: BundleStats,
  logger: Logger.Instance,
): void {
  logger.info('\n📊 Bundle Statistics');
  logger.info('─'.repeat(50));

  // Total size
  const sizeKB = formatBytes(stats.totalSize);
  logger.info(`Total Size: ${sizeKB} KB`);

  // Build time
  const timeSeconds = (stats.buildTime / 1000).toFixed(2);
  logger.info(`Build Time: ${timeSeconds}s`);

  // Tree-shaking effectiveness
  const treeshakingStatus = stats.treeshakingEffective
    ? '✅ Effective'
    : '⚠️  Not optimal (consider using named imports)';
  logger.info(`Tree-shaking: ${treeshakingStatus}`);

  // Package breakdown (names only — per-package byte sizes are not measured)
  if (stats.packages.length > 0) {
    logger.info(`\nPackages:`);
    stats.packages.forEach((pkg) => {
      logger.info(`  • ${pkg.name}`);
    });
  }

  logger.info('─'.repeat(50));
}

/**
 * Create stats summary for JSON output
 */
export function createStatsSummary(stats: BundleStats) {
  return {
    totalSize: stats.totalSize,
    totalSizeFormatted: `${formatBytes(stats.totalSize)} KB`,
    buildTime: stats.buildTime,
    buildTimeFormatted: `${(stats.buildTime / 1000).toFixed(2)}s`,
    treeshakingEffective: stats.treeshakingEffective,
    packageCount: stats.packages.length,
    packages: stats.packages.map((pkg) => ({
      name: pkg.name,
    })),
  };
}
