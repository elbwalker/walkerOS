import fs from 'fs-extra';
import { Command } from 'commander';
import { getTmpPath } from '../core/tmp.js';
import { isCacheTempName } from '../core/atomic-cache.js';
import { createCLILogger } from '../core/cli-logger.js';

export function registerCacheCommand(program: Command): void {
  const cache = program.command('cache').description('Manage the CLI cache');

  cache
    .command('clear')
    .description('Clear all cached packages and builds')
    .option('--packages', 'Clear only package cache')
    .option('--builds', 'Clear only build cache')
    .option('--tmp-dir <dir>', 'Custom temp directory')
    .option('--silent', 'Suppress output')
    .action(async (options) => {
      const logger = createCLILogger({ silent: options.silent });
      const scope = options.packages
        ? 'packages'
        : options.builds
          ? 'builds'
          : 'all';
      const cleared = await clearCache(scope, options.tmpDir);
      if (scope === 'packages') logger.info('Package cache cleared');
      else if (scope === 'builds') logger.info('Build cache cleared');
      else logger.info(`Cache cleared: ${cleared}`);
    });

  cache
    .command('info')
    .description('Show cache statistics')
    .option('--tmp-dir <dir>', 'Custom temp directory')
    .option('--silent', 'Suppress output')
    .action(async (options) => {
      const logger = createCLILogger({ silent: options.silent });
      const tmpDir = options.tmpDir;
      const packagesDir = getTmpPath(tmpDir, 'cache', 'packages');
      const buildsDir = getTmpPath(tmpDir, 'cache', 'builds');

      const packageCount = await countEntries(packagesDir);
      const buildCount = await countEntries(buildsDir);

      logger.info(`Cache directory: ${getTmpPath(tmpDir, 'cache')}`);
      logger.info(`Cached packages: ${packageCount}`);
      logger.info(`Cached builds: ${buildCount}`);
    });
}

/**
 * Remove a cache scope. Whole directories go, so the `.tmp-*` leftovers of
 * interrupted cache writes inside them go too. Returns the removed path.
 */
export async function clearCache(
  scope: 'packages' | 'builds' | 'all',
  tmpDir?: string,
): Promise<string> {
  const dir =
    scope === 'all'
      ? getTmpPath(tmpDir, 'cache')
      : getTmpPath(tmpDir, 'cache', scope);
  await fs.remove(dir);
  return dir;
}

async function countEntries(dir: string): Promise<number> {
  if (!(await fs.pathExists(dir))) return 0;
  // Temp siblings of an entry being written (or left by a crash) are not
  // entries; `cache clear` removes them with the rest.
  const entries = await fs.readdir(dir);
  return entries.filter((entry) => !isCacheTempName(entry)).length;
}
