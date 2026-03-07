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
import {
  createDeployCommand,
  listDeploymentsCommand,
  deleteDeploymentCommand,
  getDeploymentBySlugCommand,
} from './commands/deployments/index.js';

const program = new Command();

program
  .name('walkeros')
  .description('walkerOS CLI - Bundle and deploy walkerOS components')
  .version(VERSION);

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
  .command('validate [input]')
  .description(
    'Validate flow configuration (schema, references, cross-step examples)',
  )
  .option(
    '-t, --type <type>',
    'validation type: flow, event, mapping, contract',
    'flow',
  )
  .option(
    '--path <path>',
    'validate a specific entry against its package schema (e.g. destinations.snowplow)',
  )
  .option('-o, --output <path>', 'write result to file')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .option('--strict', 'fail on warnings')
  .action(async (input, options) => {
    await validateCommand({
      type: options.type || 'flow',
      input,
      output: options.output,
      flow: options.flow,
      path: options.path,
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

// Unified deploy command group
const deployCmd = program
  .command('deploy')
  .description('Create, manage, and deploy flows');

// deploy create [config] — placeholder until Task 2
deployCmd
  .command('create [config]')
  .description(
    'Create a deployment (infers type from flow config or remote flow)',
  )
  .option('--label <string>', 'human-readable label')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (config, options) => {
    await createDeployCommand(config, options);
  });

// deploy start <flowId> — existing cloud deploy (unchanged logic)
deployCmd
  .command('start <flowId>')
  .description('Deploy a flow to walkerOS cloud (auto-detects web or server)')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-f, --flow <name>', 'flow name for multi-config flows')
  .option('--no-wait', 'do not wait for deployment to complete')
  .option(
    '--timeout <seconds>',
    'timeout for deployment polling (default: 120)',
  )
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flowId, options) => {
    await deployCommand(flowId, options);
  });

// deploy list
deployCmd
  .command('list')
  .description('List all deployments in a project')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('--type <type>', 'filter by type: web, server')
  .option('--status <status>', 'filter by status')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (options) => {
    await listDeploymentsCommand(options);
  });

// deploy status <id-or-slug>
deployCmd
  .command('status <id-or-slug>')
  .description('Get deployment details by ID or slug')
  .option('--project <id>', 'project ID')
  .option('-o, --output <path>', 'output file path')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (idOrSlug, options) => {
    await getDeploymentBySlugCommand(idOrSlug, options);
  });

// deploy delete <id-or-slug>
deployCmd
  .command('delete <id-or-slug>')
  .description('Delete a deployment')
  .option('--project <id>', 'project ID')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (idOrSlug, options) => {
    await deleteDeploymentCommand(idOrSlug, options);
  });

// Run command
program
  .command('run [file]')
  .description('Run a walkerOS flow')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('--flow-id <id>', 'API flow ID (enables heartbeat, polling, secrets)')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-p, --port <number>', 'port to listen on (default: 8080)', parseInt)
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    await runCommand({
      config: file || process.env.BUNDLE,
      port:
        options.port ??
        (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined),
      flow:
        options.flow ?? process.env.WALKEROS_FLOW_NAME ?? process.env.FLOW_NAME,
      flowId:
        options.flowId ?? process.env.WALKEROS_FLOW_ID ?? process.env.FLOW_ID,
      project:
        options.project ??
        process.env.WALKEROS_PROJECT_ID ??
        process.env.PROJECT_ID,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Cache command
registerCacheCommand(program);

// Show banner when called without any arguments (bare `walkeros`)
if (process.argv.length <= 2) {
  printBanner(VERSION);
  console.error('Run walkeros --help for usage information.');
  process.exit(0);
}

program.parse();
