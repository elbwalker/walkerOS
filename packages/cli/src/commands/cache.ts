import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';

const CACHE_DIR = path.join('.tmp', 'cache');

export function registerCacheCommand(program: Command): void {
  const cache = program.command('cache').description('Manage the CLI cache');

  cache
    .command('clear')
    .description('Clear all cached packages and builds')
    .option('--packages', 'Clear only package cache')
    .option('--builds', 'Clear only build cache')
    .action(async (options) => {
      if (options.packages) {
        await fs.remove(path.join(CACHE_DIR, 'packages'));
        console.log('Package cache cleared');
      } else if (options.builds) {
        await fs.remove(path.join(CACHE_DIR, 'builds'));
        console.log('Build cache cleared');
      } else {
        await fs.remove(CACHE_DIR);
        console.log('All caches cleared');
      }
    });

  cache
    .command('info')
    .description('Show cache statistics')
    .action(async () => {
      const packagesDir = path.join(CACHE_DIR, 'packages');
      const buildsDir = path.join(CACHE_DIR, 'builds');

      const packageCount = await countEntries(packagesDir);
      const buildCount = await countEntries(buildsDir);

      console.log(`Cache directory: ${CACHE_DIR}`);
      console.log(`Cached packages: ${packageCount}`);
      console.log(`Cached builds: ${buildCount}`);
    });
}

async function countEntries(dir: string): Promise<number> {
  if (!(await fs.pathExists(dir))) return 0;
  const entries = await fs.readdir(dir);
  return entries.length;
}
