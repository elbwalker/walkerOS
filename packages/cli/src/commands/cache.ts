import fs from 'fs-extra';
import { Command } from 'commander';
import { getTmpPath, getDefaultTmpRoot } from '../core/tmp.js';

export function registerCacheCommand(program: Command): void {
  const cache = program.command('cache').description('Manage the CLI cache');

  cache
    .command('clear')
    .description('Clear all cached packages and builds')
    .option('--packages', 'Clear only package cache')
    .option('--builds', 'Clear only build cache')
    .option('--tmp-dir <dir>', 'Custom temp directory')
    .action(async (options) => {
      const tmpDir = options.tmpDir;
      if (options.packages) {
        await fs.remove(getTmpPath(tmpDir, 'cache', 'packages'));
        console.log('Package cache cleared');
      } else if (options.builds) {
        await fs.remove(getTmpPath(tmpDir, 'cache', 'builds'));
        console.log('Build cache cleared');
      } else {
        await fs.remove(getTmpPath(tmpDir, 'cache'));
        console.log('All caches cleared');
      }
    });

  cache
    .command('info')
    .description('Show cache statistics')
    .option('--tmp-dir <dir>', 'Custom temp directory')
    .action(async (options) => {
      const tmpDir = options.tmpDir;
      const packagesDir = getTmpPath(tmpDir, 'cache', 'packages');
      const buildsDir = getTmpPath(tmpDir, 'cache', 'builds');

      const packageCount = await countEntries(packagesDir);
      const buildCount = await countEntries(buildsDir);

      console.log(`Cache directory: ${getTmpPath(tmpDir, 'cache')}`);
      console.log(`Cached packages: ${packageCount}`);
      console.log(`Cached builds: ${buildCount}`);
    });
}

/**
 * Register the clean command to clear entire temp directory
 */
export function registerCleanCommand(program: Command): void {
  program
    .command('clean')
    .description('Clear the entire temp directory (.tmp/)')
    .option('--tmp-dir <dir>', 'Custom temp directory')
    .action(async (options) => {
      const tmpDir = options.tmpDir || getDefaultTmpRoot();
      await fs.remove(tmpDir);
      console.log(`Temp directory cleared: ${tmpDir}`);
    });
}

async function countEntries(dir: string): Promise<number> {
  if (!(await fs.pathExists(dir))) return 0;
  const entries = await fs.readdir(dir);
  return entries.length;
}
