import { Command } from 'commander';
import { VERSION } from './version.js';
import { bundleCommand } from './commands/bundle/index.js';
import { simulateCommand } from './commands/simulate/index.js';
import { pushCommand } from './commands/push/index.js';
import { runCommand } from './commands/run/index.js';
import { registerCacheCommand } from './commands/cache.js';

// === CLI Commands ===
// Export CLI command handlers
export { bundleCommand, simulateCommand, pushCommand, runCommand };

// === Programmatic API ===
// High-level functions for library usage
export { bundle } from './commands/bundle/index.js';
export { simulate } from './commands/simulate/index.js';
export { run } from './commands/run/index.js';

// === Types ===
// Export types for programmatic usage
// Config structure uses Flow.Setup and Flow.Config from @walkeros/core
export type {
  Flow,
  CLIBuildOptions,
  BuildOptions,
  MinifyOptions,
} from './types/bundle.js';
export type { BundleStats } from './commands/bundle/bundler.js';
export type { SimulationResult } from './commands/simulate/types.js';
export type {
  RunMode,
  RunCommandOptions,
  RunOptions,
  RunResult,
} from './commands/run/index.js';
export type { GlobalOptions } from './types/global.js';

const program = new Command();

program
  .name('walkeros')
  .description('walkerOS CLI - Bundle and deploy walkerOS components')
  .version(VERSION);

// Display startup banner before any command runs
program.hook('preAction', (thisCommand, actionCommand) => {
  const options = actionCommand.opts();
  // Skip banner for --silent, --json, or --help flags
  if (!options.silent && !options.json) {
    console.log(`🚀 walkerOS CLI v${VERSION}`);
  }
});

// Bundle command
program
  .command('bundle [file]')
  .description('Bundle NPM packages with custom code')
  .option('-f, --flow <name>', 'flow to build (for multi-flow configs)')
  .option('--all', 'build all flows (for multi-flow configs)')
  .option('-s, --stats', 'show bundle statistics')
  .option('--json', 'output statistics in JSON format (implies --stats)')
  .option('--no-cache', 'disable package caching and download fresh packages')
  .option('-v, --verbose', 'verbose output')
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await bundleCommand({
      config: file || 'bundle.config.json',
      flow: options.flow,
      all: options.all,
      stats: options.stats,
      json: options.json,
      cache: options.cache,
      verbose: options.verbose,
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
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await simulateCommand({
      config: file || 'bundle.config.json',
      event: options.event,
      json: options.json,
      verbose: options.verbose,
      dryRun: options.dryRun,
      silent: options.silent,
    });
  });

// Push command
program
  .command('push [file]')
  .description('Push an event through the flow with real API execution')
  .requiredOption(
    '-e, --event <source>',
    'Event to push (JSON string, file path, or URL)',
  )
  .option('--flow <name>', 'Flow name (for multi-flow configs)')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('-s, --silent', 'Suppress output')
  .action(async (file, options) => {
    await pushCommand({
      config: file || 'bundle.config.json',
      event: options.event,
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
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
  .option('--dry-run', 'preview command without executing')
  .option('--silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand('collect', {
      config: file || 'server-collect.mjs',
      port: options.port,
      host: options.host,
      json: options.json,
      verbose: options.verbose,
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
      dryRun: options.dryRun,
      silent: options.silent,
    });
  });

// Cache command
registerCacheCommand(program);

// Run the CLI
// Note: This file is marked as a bin script in package.json,
// so it's always executed directly (never imported as a library)
program.parse();
