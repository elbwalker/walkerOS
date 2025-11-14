import { Command } from 'commander';
import { bundleCommand } from './bundle';
import { simulateCommand } from './simulate';
import { runCommand } from './run';

// === CLI Commands ===
// Export CLI command handlers
export { bundleCommand, simulateCommand, runCommand };

// === Programmatic API ===
// High-level functions for library usage
export { bundle } from './bundle';
export { simulate } from './simulate';
export { run } from './run';

// === Types ===
// Export types for programmatic usage
export type { BuildOptions, EnvironmentConfig, Setup } from './types/bundle';
export type { BundleStats } from './bundle/bundler';
export type { SimulationResult } from './simulate/types';
export type {
  SourceDestinationItem,
  TemplateVariables,
  ProcessedTemplateVariables,
  TemplateSource,
  TemplateDestination,
} from './types/template';
export type { RunMode, RunCommandOptions, RunOptions, RunResult } from './run';

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
  .action(async (options) => {
    await bundleCommand({
      config: options.config,
      env: options.env,
      all: options.all,
      stats: options.stats,
      json: options.json,
      cache: options.cache,
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

// Run command
program
  .command('run <mode> <config>')
  .description('Run walkerOS in Docker (modes: collect, serve)')
  .option('-p, --port <number>', 'Server port', parseInt)
  .option('-h, --host <host>', 'Server host (default: 0.0.0.0)')
  .option('-d, --detach', 'Run container in background')
  .option('--name <name>', 'Container name')
  .option('--no-pull', 'Skip Docker image pull')
  .option(
    '--image <image>',
    'Docker image to use (default: walkeros/docker:latest)',
  )
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .action(async (mode, config, options) => {
    await runCommand(mode, {
      config,
      port: options.port,
      host: options.host,
      detach: options.detach,
      name: options.name,
      noPull: !options.pull,
      image: options.image,
      json: options.json,
      verbose: options.verbose,
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
