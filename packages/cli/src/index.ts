import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { bundleCommand } from './commands/bundle/index.js';
import { simulateCommand } from './commands/simulate/index.js';
import { runCommand } from './commands/run/index.js';

// Get package version dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
);
const VERSION = packageJson.version;

// === CLI Commands ===
// Export CLI command handlers
export { bundleCommand, simulateCommand, runCommand };

// === Programmatic API ===
// High-level functions for library usage
export { bundle } from './commands/bundle/index.js';
export { simulate } from './commands/simulate/index.js';
export { run } from './commands/run/index.js';

// === Types ===
// Export types for programmatic usage
export type { BuildOptions, EnvironmentConfig, Setup } from './types/bundle';
export type { BundleStats } from './commands/bundle/bundler';
export type { SimulationResult } from './commands/simulate/types';
export type {
  SourceDestinationItem,
  TemplateVariables,
  ProcessedTemplateVariables,
  TemplateSource,
  TemplateDestination,
} from './types/template';
export type {
  RunMode,
  RunCommandOptions,
  RunOptions,
  RunResult,
} from './commands/run';
export type { GlobalOptions } from './types/global';

const program = new Command();

program
  .name('walkeros')
  .description('walkerOS CLI - Bundle and deploy walkerOS components')
  .version(VERSION);

// Bundle command
program
  .command('bundle [file]')
  .description('Bundle NPM packages with custom code')
  .option(
    '-e, --env <name>',
    'environment to build (for multi-environment configs)',
  )
  .option('--all', 'build all environments (for multi-environment configs)')
  .option('-s, --stats', 'show bundle statistics')
  .option('--json', 'output statistics in JSON format (implies --stats)')
  .option('--no-cache', 'disable package caching and download fresh packages')
  .option('-v, --verbose', 'verbose output')
  .option('--local', 'execute in local Node.js instead of Docker')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await bundleCommand({
      config: file || 'bundle.config.json',
      env: options.env,
      all: options.all,
      stats: options.stats,
      json: options.json,
      cache: options.cache,
      verbose: options.verbose,
      local: options.local,
      dryRun: options.dryRun,
      silent: options.silent,
    });
  });

// Simulate command
program
  .command('simulate [file]')
  .description('Simulate event processing and capture API calls')
  .option(
    '-e, --event <source>',
    'Event to simulate (JSON string, file path, or URL)',
  )
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--local', 'execute in local Node.js instead of Docker')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await simulateCommand({
      config: file || 'bundle.config.json',
      event: options.event,
      json: options.json,
      verbose: options.verbose,
      local: options.local,
      dryRun: options.dryRun,
      silent: options.silent,
    });
  });

// Run command with subcommands
const runCmd = program
  .command('run')
  .description('Run walkerOS flows in collect or serve mode');

// Run collect subcommand
runCmd
  .command('collect [file]')
  .description(
    'Run collector mode (event collection endpoint). Defaults to server-collect.mjs if no file specified.',
  )
  .option('-p, --port <number>', 'Port to listen on (default: 8080)', parseInt)
  .option('-h, --host <address>', 'Host address (default: 0.0.0.0)')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--local', 'execute in local Node.js instead of Docker')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand('collect', {
      config: file || 'server-collect.mjs',
      port: options.port,
      host: options.host,
      json: options.json,
      verbose: options.verbose,
      local: options.local,
      dryRun: options.dryRun,
      silent: options.silent,
    });
  });

// Run serve subcommand
runCmd
  .command('serve [file]')
  .description(
    'Run serve mode (single-file server for browser bundles). Defaults to baked-in web-serve.js if no file specified.',
  )
  .option('-p, --port <number>', 'Port to listen on (default: 8080)', parseInt)
  .option('-h, --host <address>', 'Host address (default: 0.0.0.0)')
  .option('--name <filename>', 'Filename in URL (default: walker.js)')
  .option('--path <directory>', 'URL directory path (e.g., libs/v1)')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--local', 'execute in local Node.js instead of Docker')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand('serve', {
      config: file || 'web-serve.js',
      port: options.port,
      host: options.host,
      serveName: options.name,
      servePath: options.path,
      json: options.json,
      verbose: options.verbose,
      local: options.local,
      dryRun: options.dryRun,
      silent: options.silent,
    });
  });

// Run the CLI
// Note: This file is marked as a bin script in package.json,
// so it's always executed directly (never imported as a library)
program.parse();
