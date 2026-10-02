import path from 'path';
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
      else logger.info(`Cache cleared: ${cleared.join(', ')}`);
    });

  cache
    .command('info')
    .description('Show cache statistics')
    .option('--tmp-dir <dir>', 'Custom temp directory')
    .option('--silent', 'Suppress output')
    .action(async (options) => {
      const logger = createCLILogger({ silent: options.silent });
      const tmpDir = options.tmpDir;
      const info = await cacheInfo(tmpDir);

      logger.info(`Cache directory: ${getTmpPath(tmpDir, 'cache')}`);
      logger.info(`Cached packages: ${info.packages}`);
      logger.info(`Cached builds: ${info.builds}`);
      logger.info(`Cached code: ${info.code}`);
    });
}

/**
 * Remove a cache scope. Whole directories go, so the `.tmp-*` leftovers of
 * interrupted cache writes inside them go too. The builds scope covers both
 * build caches: finished builds and the compiled code they are made from.
 * Returns the removed paths.
 */
export async function clearCache(
  scope: 'packages' | 'builds' | 'all',
  tmpDir?: string,
): Promise<string[]> {
  const dirs =
    scope === 'all'
      ? [getTmpPath(tmpDir, 'cache')]
      : scope === 'builds'
        ? [
            getTmpPath(tmpDir, 'cache', 'builds'),
            getTmpPath(tmpDir, 'cache', 'code'),
          ]
        : [getTmpPath(tmpDir, 'cache', 'packages')];
  for (const dir of dirs) await fs.remove(dir);
  return dirs;
}

/**
 * Entry counts per cache scope. `code` holds the compiled code builds are
 * made from, one `.js` and one `.mjs` file per key, so it counts keys;
 * `cache clear --builds` removes it with the builds.
 */
export async function cacheInfo(
  tmpDir?: string,
): Promise<{ packages: number; builds: number; code: number }> {
  return {
    packages: await countEntries(getTmpPath(tmpDir, 'cache', 'packages')),
    builds: await countEntries(getTmpPath(tmpDir, 'cache', 'builds')),
    code: await countEntries(getTmpPath(tmpDir, 'cache', 'code'), true),
  };
}

async function countEntries(dir: string, byKey = false): Promise<number> {
  if (!(await fs.pathExists(dir))) return 0;
  // Temp siblings of an entry being written (or left by a crash) are not
  // entries; `cache clear` removes them with the rest.
  const entries = (await fs.readdir(dir)).filter(
    (entry) => !isCacheTempName(entry),
  );
  if (!byKey) return entries.length;
  return new Set(entries.map((entry) => path.parse(entry).name)).size;
}
