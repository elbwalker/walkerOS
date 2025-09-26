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
