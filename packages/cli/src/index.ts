import { Command } from 'commander';
import { VERSION } from './version.js';
import { printBanner } from './core/banner.js';
import { bundleCommand } from './commands/bundle/index.js';
import { simulateCommand } from './commands/simulate/index.js';
import { pushCommand } from './commands/push/index.js';
import { runCommand } from './commands/run/index.js';
import { validateCommand } from './commands/validate/index.js';
import {
  registerCacheCommand,
  registerCleanCommand,
} from './commands/cache.js';
import { configPullCommand } from './commands/config/index.js';

// === CLI Commands ===
// Export CLI command handlers
export { bundleCommand, simulateCommand, pushCommand, runCommand };

// === Programmatic API ===
// High-level functions for library usage
export { bundle } from './commands/bundle/index.js';
export { simulate } from './commands/simulate/index.js';
export { run } from './commands/run/index.js';
export { validate } from './commands/validate/index.js';
export { getToken, getAuthHeaders, authenticatedFetch } from './core/auth.js';
export { configPull } from './commands/config/index.js';

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
export type {
  ValidateResult,
  ValidationType,
  ValidationError,
  ValidationWarning,
} from './commands/validate/types.js';

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
    printBanner(VERSION);
  }
});

// Bundle command
program
  .command('bundle [file]')
  .description('Bundle NPM packages with custom code')
  .option('--flow <name>', 'flow name for multi-flow configs')
  .option('--all', 'build all flows for multi-flow configs')
  .option('--stats', 'show bundle statistics')
  .option('--json', 'output as JSON (implies --stats)')
  .option('--no-cache', 'disable package caching')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .option(
    '--dockerfile [file]',
    'generate Dockerfile (or copy custom file) to dist/',
  )
  .action(async (file, options) => {
    await bundleCommand({
      config: file || 'bundle.config.json',
      flow: options.flow,
      all: options.all,
      stats: options.stats,
      json: options.json,
      cache: options.cache,
      verbose: options.verbose,
      silent: options.silent,
      dockerfile: options.dockerfile,
    });
  });

// Simulate command
program
  .command('simulate [file]')
  .description('Simulate event processing and capture API calls')
  .option(
    '-e, --event <source>',
    'event to simulate (JSON string, file path, or URL)',
  )
  .option('--flow <name>', 'flow name for multi-flow configs')
  .option('-p, --platform <platform>', 'platform override (web or server)')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    await simulateCommand({
      config: file || 'bundle.config.json',
      event: options.event,
      flow: options.flow,
      platform: options.platform,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Push command
program
  .command('push [file]')
  .description('Push an event through the flow with real API execution')
  .requiredOption(
    '-e, --event <source>',
    'event to push (JSON string, file path, or URL)',
  )
  .option('--flow <name>', 'flow name for multi-flow configs')
  .option('-p, --platform <platform>', 'platform override (web or server)')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    await pushCommand({
      config: file || 'bundle.config.json',
      event: options.event,
      flow: options.flow,
      platform: options.platform,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Validate command
program
  .command('validate <type> [input]')
  .description('Validate event, flow, or mapping configuration')
  .option('--flow <name>', 'flow name for multi-flow configs')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .option('--strict', 'fail on warnings')
  .action(async (type, input, options) => {
    await validateCommand({
      type,
      input,
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
      strict: options.strict,
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
  .option('-p, --port <number>', 'port to listen on (default: 8080)', parseInt)
  .option('-h, --host <address>', 'host address (default: 0.0.0.0)')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand('collect', {
      config: file || 'server-collect.mjs',
      port: options.port,
      host: options.host,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Run serve subcommand
runCmd
  .command('serve [file]')
  .description(
    'Run serve mode (single-file server for browser bundles). Defaults to baked-in web-serve.js if no file specified.',
  )
  .option('-p, --port <number>', 'port to listen on (default: 8080)', parseInt)
  .option('-h, --host <address>', 'host address (default: 0.0.0.0)')
  .option('--name <filename>', 'filename in URL (default: walker.js)')
  .option('--path <directory>', 'URL directory path (e.g., libs/v1)')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand('serve', {
      config: file || 'web-serve.js',
      port: options.port,
      host: options.host,
      serveName: options.name,
      servePath: options.path,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Config command group
const configCmd = program
  .command('config')
  .description('Manage walkerOS configurations');

configCmd
  .command('pull <config-id>')
  .description('Pull a configuration from walkerOS app')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (configId, options) => {
    await configPullCommand({
      configId,
      output: options.output,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Cache command
registerCacheCommand(program);

// Clean command
registerCleanCommand(program);

// Run the CLI
// Note: This file is marked as a bin script in package.json,
// so it's always executed directly (never imported as a library)
program.parse();
