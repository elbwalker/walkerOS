/**
 * Bundle statistics display utilities
 */
import { formatBytes } from '../core';
import type { BundleStats } from './bundler';
import type { Logger } from '../core';

/**
 * Display detailed bundle statistics to console
 */
export function displayStats(stats: BundleStats, logger: Logger): void {
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

  // Package breakdown
  if (stats.packages.length > 0) {
    logger.info(`\nPackage Breakdown:`);
    stats.packages.forEach((pkg) => {
      if (pkg.size > 0) {
        const pkgSizeKB = formatBytes(pkg.size);
        logger.info(`  • ${pkg.name}: ${pkgSizeKB} KB`);
      }
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
      size: pkg.size,
      sizeFormatted: `${formatBytes(pkg.size)} KB`,
    })),
  };
}
