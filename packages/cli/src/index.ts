import { Command } from 'commander';
import { bundleCommand } from './commands/bundle';
import { simulateCommand } from './commands/simulate';
import { runCommand } from './commands/run';

// === CLI Commands ===
// Export CLI command handlers
export { bundleCommand, simulateCommand, runCommand };

// === Programmatic API ===
// High-level functions for library usage
export { bundle } from './commands/bundle';
export { simulate } from './commands/simulate';
export { run } from './commands/run';

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
  .action(async (options) => {
    await bundleCommand({
      config: options.config,
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
  .option('--local', 'execute in local Node.js instead of Docker')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (options) => {
    await simulateCommand({
      config: options.config,
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
  .command('collect <file>')
  .description('Run collector mode (event collection endpoint)')
  .option('-p, --port <number>', 'Port to listen on (default: 8080)', parseInt)
  .option('-h, --host <address>', 'Host address (default: 0.0.0.0)')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--local', 'execute in local Node.js instead of Docker')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand('collect', {
      config: file,
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
  .command('serve <file>')
  .description('Run serve mode (static file server for browser bundles)')
  .option('-p, --port <number>', 'Port to listen on (default: 8080)', parseInt)
  .option('-h, --host <address>', 'Host address (default: 0.0.0.0)')
  .option('--static-dir <dir>', 'Static directory for serve mode')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--local', 'execute in local Node.js instead of Docker')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand('serve', {
      config: file,
      port: options.port,
      host: options.host,
      staticDir: options.staticDir,
      json: options.json,
      verbose: options.verbose,
      local: options.local,
      dryRun: options.dryRun,
      silent: options.silent,
    });
  });

// Only run CLI if this file is executed directly (not imported as a module)
// Check if the resolved file path matches the first CLI argument
import { fileURLToPath } from 'url';
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  program.parse();
}
