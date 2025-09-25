#!/usr/bin/env node
import { Command } from 'commander';
import { bundleCommand } from './bundle';
import { deployCommand } from './deploy';
import { simulateCommand } from './simulate';

const program = new Command();

program
  .name('walkeros')
  .description('walkerOS CLI - Bundle and deploy walkerOS components')
  .version('0.1.0');

// Bundle command
program
  .command('bundle')
  .description('Bundle NPM packages with custom code')
  .option(
    '-c, --config <path>',
    'configuration file path',
    'bundle.config.json',
  )
  .option('-s, --stats', 'show bundle statistics')
  .option('--json', 'output statistics in JSON format (implies --stats)')
  .option('--no-cache', 'disable package caching and download fresh packages')
  .option('-v, --verbose', 'verbose output')
  .action(async (options) => {
    await bundleCommand({
      config: options.config,
      stats: options.stats,
      json: options.json,
      cache: options.cache,
      verbose: options.verbose,
    });
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy using configured drivers (simulated)')
  .option('-c, --config <path>', 'Path to config file', 'deployer.json')
  .option('--dry-run', 'Preview deployment without making changes')
  .option('--json', 'output results in JSON format')
  .option('-v, --verbose', 'verbose output')
  .action(async (options) => {
    await deployCommand({
      config: options.config,
      dryRun: options.dryRun,
      json: options.json,
      verbose: options.verbose,
    });
  });

// Simulate command
program
  .command('simulate')
  .description('Simulate event processing and capture API calls')
  .option(
    '-c, --config <path>',
    'Bundle configuration file',
    'bundle.config.json',
  )
  .option('-e, --event <json>', 'Event to simulate (JSON string)')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    await simulateCommand({
      config: options.config,
      event: options.event,
      json: options.json,
      verbose: options.verbose,
    });
  });

program.parse();
