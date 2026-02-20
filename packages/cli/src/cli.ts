import { Command } from 'commander';
import { VERSION } from './version.js';
import { printBanner } from './core/banner.js';
import { bundleCommand } from './commands/bundle/index.js';
import { simulateCommand } from './commands/simulate/index.js';
import { pushCommand } from './commands/push/index.js';
import { runCommand } from './commands/run/index.js';
import { validateCommand } from './commands/validate/index.js';
import { registerCacheCommand } from './commands/cache.js';
import { loginCommand } from './commands/login/index.js';
import { logoutCommand } from './commands/logout/index.js';
import { whoamiCommand } from './commands/auth/index.js';
import {
  listProjectsCommand,
  getProjectCommand,
  createProjectCommand,
  updateProjectCommand,
  deleteProjectCommand,
} from './commands/projects/index.js';
import {
  listFlowsCommand,
  getFlowCommand,
  createFlowCommand,
  updateFlowCommand,
  deleteFlowCommand,
  duplicateFlowCommand,
} from './commands/flows/index.js';
import {
  deployCommand,
  getDeploymentCommand,
} from './commands/deploy/index.js';

const program = new Command();

program
  .name('walkeros')
  .description('walkerOS CLI - Bundle and deploy walkerOS components')
  .version(VERSION);

// Display startup banner before any command runs
// Suppressed when piping (non-TTY stdout), --silent, or --json
program.hook('preAction', (thisCommand, actionCommand) => {
  const options = actionCommand.opts();
  if (!options.silent && !options.json && process.stdout.isTTY) {
    printBanner(VERSION);
  }
});

// Bundle command
program
  .command('bundle [file]')
  .description('Bundle NPM packages with custom code')
  .option('-o, --output <path>', 'write bundle to file or directory')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
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
      config: file,
      output: options.output,
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
  .option('-o, --output <path>', 'write result to file')
  .option(
    '-e, --event <source>',
    'event to simulate (JSON string, file path, or URL)',
  )
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('-p, --platform <platform>', 'platform override (web or server)')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    await simulateCommand({
      config: file,
      output: options.output,
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
  .option('-o, --output <path>', 'write result to file')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('-p, --platform <platform>', 'platform override (web or server)')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    await pushCommand({
      config: file,
      output: options.output,
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
  .option('-o, --output <path>', 'write result to file')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .option('--strict', 'fail on warnings')
  .action(async (type, input, options) => {
    await validateCommand({
      type,
      input,
      output: options.output,
      flow: options.flow,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
      strict: options.strict,
    });
  });

// Auth command group
const authCmd = program
  .command('auth')
  .description('Authentication and identity');

authCmd
  .command('login')
  .description('Log in to walkerOS via browser')
  .option('--url <url>', 'custom app URL')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (options) => {
    await loginCommand({
      url: options.url,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

authCmd
  .command('logout')
  .description('Remove stored credentials')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (options) => {
    await logoutCommand({
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

authCmd
  .command('whoami')
  .description('Show current user identity')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (options) => {
    await whoamiCommand({
      output: options.output,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Projects command group
const projectsCmd = program
  .command('projects')
  .description('Manage walkerOS projects');

projectsCmd
  .command('list')
  .description('List all projects')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (options) => {
    await listProjectsCommand(options);
  });

projectsCmd
  .command('get [projectId]')
  .description('Get project details')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (projectId, options) => {
    await getProjectCommand(projectId, options);
  });

projectsCmd
  .command('create <name>')
  .description('Create a new project')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (name, options) => {
    await createProjectCommand(name, options);
  });

projectsCmd
  .command('update [projectId]')
  .description('Update a project')
  .requiredOption('--name <name>', 'new project name')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (projectId, options) => {
    await updateProjectCommand(projectId, options);
  });

projectsCmd
  .command('delete [projectId]')
  .description('Delete a project')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (projectId, options) => {
    await deleteProjectCommand(projectId, options);
  });

// Flows command group
const flowsCmd = program.command('flows').description('Manage walkerOS flows');

flowsCmd
  .command('list')
  .description('List all flows in a project')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('--sort <field>', 'sort by: name, updated_at, created_at')
  .option('--order <dir>', 'sort order: asc, desc')
  .option('--include-deleted', 'include soft-deleted flows')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (options) => {
    await listFlowsCommand(options);
  });

flowsCmd
  .command('get <flowId>')
  .description('Get a flow with its full content')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flowId, options) => {
    await getFlowCommand(flowId, options);
  });

flowsCmd
  .command('create <name>')
  .description('Create a new flow')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-c, --content <json>', 'Flow.Setup JSON string or file path')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (name, options) => {
    await createFlowCommand(name, options);
  });

flowsCmd
  .command('update <flowId>')
  .description('Update a flow')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('--name <name>', 'new flow name')
  .option('-c, --content <json>', 'new Flow.Setup JSON string or file path')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flowId, options) => {
    await updateFlowCommand(flowId, options);
  });

flowsCmd
  .command('delete <flowId>')
  .description('Delete a flow')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flowId, options) => {
    await deleteFlowCommand(flowId, options);
  });

flowsCmd
  .command('duplicate <flowId>')
  .description('Duplicate a flow')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('--name <name>', 'name for the copy')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flowId, options) => {
    await duplicateFlowCommand(flowId, options);
  });

// Deploy command group
const deployCmd = program
  .command('deploy')
  .description('Deploy flows to walkerOS cloud');

deployCmd
  .command('start <flowId>')
  .description('Deploy a flow (auto-detects web or server)')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-f, --flow <name>', 'flow name for multi-config flows')
  .option('--no-wait', 'do not wait for deployment to complete')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flowId, options) => {
    await deployCommand(flowId, options);
  });

deployCmd
  .command('status <flowId>')
  .description('Get the latest deployment status for a flow')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-f, --flow <name>', 'flow name for multi-config flows')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flowId, options) => {
    await getDeploymentCommand(flowId, options);
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

// Cache command
registerCacheCommand(program);

// Run the CLI
program.parse();
