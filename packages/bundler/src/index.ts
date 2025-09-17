#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { parseConfig } from './config.js';
import { bundle, type BundleStats } from './bundler.js';

const program = new Command();

program
  .name('walkeros-bundle')
  .description('Bundle NPM packages with custom code')
  .version('0.1.0')
  .option(
    '-c, --config <path>',
    'configuration file path',
    'bundle.config.json',
  )
  .option('-s, --stats', 'show bundle statistics')
  .option('--json', 'output statistics in JSON format (implies --stats)')
  .action(async (options) => {
    const startTime = Date.now();
    const log = (message: string) => {
      if (!options.json) {
        // eslint-disable-next-line no-console
        console.log(message);
      }
    };

    try {
      // Step 1: Read configuration file
      log(chalk.blue('📦 Reading configuration...'));
      const configPath = path.resolve(options.config);

      if (!(await fs.pathExists(configPath))) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const rawConfig = await fs.readJson(configPath);
      const config = parseConfig(rawConfig);

      // Step 2: Run bundler
      const shouldCollectStats = options.stats || options.json;
      log(chalk.blue('🔧 Starting bundle process...'));
      const stats = await bundle(config, shouldCollectStats, options.json);

      // Step 3: Show stats if requested
      if (options.json && stats) {
        // JSON output for CI/CD
        const output = {
          success: true,
          stats,
          duration: (Date.now() - startTime) / 1000,
        };
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
      } else {
        if (options.stats && stats) {
          displayStats(stats);
        }

        // Step 4: Success message
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log(chalk.green(`✅ Bundle created successfully in ${duration}s`));
      }
    } catch (error) {
      if (options.json) {
        // JSON error output for CI/CD
        const output = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: (Date.now() - startTime) / 1000,
        };
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
      } else {
        // eslint-disable-next-line no-console
        console.error(chalk.red('❌ Bundle failed:'));
        // eslint-disable-next-line no-console
        console.error(error instanceof Error ? error.message : error);
      }
      process.exit(1);
    }
  });

function displayStats(stats: BundleStats): void {
  // eslint-disable-next-line no-console
  console.log('\n' + chalk.cyan('📊 Bundle Statistics'));
  // eslint-disable-next-line no-console
  console.log(chalk.gray('─'.repeat(50)));

  // Total size
  const sizeKB = (stats.totalSize / 1024).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(`${chalk.yellow('Total Size:')} ${sizeKB} KB`);

  // Build time
  const timeSeconds = (stats.buildTime / 1000).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(`${chalk.yellow('Build Time:')} ${timeSeconds}s`);

  // Tree-shaking effectiveness
  const treeshakingStatus = stats.treeshakingEffective
    ? chalk.green('✅ Effective')
    : chalk.red('⚠️  Not optimal (consider using named imports)');
  // eslint-disable-next-line no-console
  console.log(`${chalk.yellow('Tree-shaking:')} ${treeshakingStatus}`);

  // Package breakdown
  if (stats.packages.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`\n${chalk.yellow('Package Breakdown:')}`);
    stats.packages.forEach((pkg) => {
      if (pkg.size > 0) {
        const pkgSizeKB = (pkg.size / 1024).toFixed(2);
        // eslint-disable-next-line no-console
        console.log(`  • ${pkg.name}: ${pkgSizeKB} KB`);
      }
    });
  }

  // eslint-disable-next-line no-console
  console.log(chalk.gray('─'.repeat(50)));
}

program.parse();
