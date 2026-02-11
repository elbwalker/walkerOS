import fs from 'fs-extra';
import { Command } from 'commander';
import { getTmpPath } from '../core/tmp.js';
import { createLogger } from '../core/logger.js';

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
      const logger = createLogger({ silent: options.silent });
      const tmpDir = options.tmpDir;
      if (options.packages) {
        await fs.remove(getTmpPath(tmpDir, 'cache', 'packages'));
        logger.log('Package cache cleared');
      } else if (options.builds) {
        await fs.remove(getTmpPath(tmpDir, 'cache', 'builds'));
        logger.log('Build cache cleared');
      } else {
        const tmpRoot = getTmpPath(tmpDir);
        await fs.remove(tmpRoot);
        logger.log(`Temp directory cleared: ${tmpRoot}`);
      }
    });

  cache
    .command('info')
    .description('Show cache statistics')
    .option('--tmp-dir <dir>', 'Custom temp directory')
    .option('--silent', 'Suppress output')
    .action(async (options) => {
      const logger = createLogger({ silent: options.silent });
      const tmpDir = options.tmpDir;
      const packagesDir = getTmpPath(tmpDir, 'cache', 'packages');
      const buildsDir = getTmpPath(tmpDir, 'cache', 'builds');

      const packageCount = await countEntries(packagesDir);
      const buildCount = await countEntries(buildsDir);

      logger.log(`Cache directory: ${getTmpPath(tmpDir, 'cache')}`);
      logger.log(`Cached packages: ${packageCount}`);
      logger.log(`Cached builds: ${buildCount}`);
    });
}

async function countEntries(dir: string): Promise<number> {
  if (!(await fs.pathExists(dir))) return 0;
  const entries = await fs.readdir(dir);
  return entries.length;
}
