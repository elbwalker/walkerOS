import { Command } from 'commander';
import { VERSION } from './version.js';
import { setClientContext } from './core/client-context.js';
import { handleCliError } from './core/api-error.js';
import { printBanner } from './core/banner.js';
import { createEmitter } from './telemetry/index.js';
import { bundleCommand } from './commands/bundle/index.js';
import { pushCommand } from './commands/push/index.js';
import { runCommand } from './commands/run/index.js';
import { setupCommand } from './commands/setup/index.js';
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
import { feedbackCommand } from './commands/feedback/index.js';
import {
  telemetryStatusCommand,
  telemetryEnableCommand,
  telemetryDisableCommand,
} from './commands/telemetry/index.js';
import { writeResult } from './core/output.js';

setClientContext({ type: 'cli', version: VERSION });

// Resolve the telemetry emitter up-front. createEmitter is fast and mostly
// synchronous (consent check + env collection + first-run notice). Awaiting
// here lets the exit-path code (process.on('exit')) fire `send` synchronously
// in debug mode, which writes to stderr before any await point. Microtasks
// don't run after `exit` fires.
const emitter = await createEmitter({
  source: { type: 'cli', platform: 'terminal' },
  packageVersion: VERSION,
});

let cmdStart = 0;
let cmdPath = '';
let telemetryEmitted = false;

// Top-level safety net for ApiError(CLIENT_OUTDATED) and other uncaught errors.
// Command handlers may catch errors locally; anything that escapes lands here.
process.on('uncaughtException', async (err) => {
  try {
    await emitter.send('error throw', { kind: 'uncaught' });
  } catch {
    /* never throw from telemetry */
  }
  handleCliError(err);
});
process.on('unhandledRejection', async (err) => {
  try {
    await emitter.send('error throw', { kind: 'unhandledRejection' });
  } catch {
    /* never throw from telemetry */
  }
  handleCliError(err);
});

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
  .option(
    '--simulate <step>',
    'simulate a step (repeatable for destination.*; format: source.NAME | destination.NAME | transformer.NAME)',
    (val: string, arr: string[]) => {
      arr.push(val);
      return arr;
    },
    [] as string[],
  )
  .option(
    '--mock <step=value>',
    'mock a destination step with return value (repeatable)',
    (val: string, arr: string[]) => {
      arr.push(val);
      return arr;
    },
    [] as string[],
  )
  .option(
    '--snapshot <source>',
    'JS file to eval before bundle execution (file path, URL, or inline code)',
  )
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
      simulate: options.simulate,
      mock: options.mock,
      snapshot: options.snapshot,
    });
  });

// Setup command
program
  .command('setup <target>')
  .description(
    'Run the setup function for one component. ' +
      'Target format: source.NAME | destination.NAME | store.NAME.',
  )
  .option('-c, --config <path>', 'flow config file', './flow.json')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (target, options) => {
    try {
      await setupCommand({
        target,
        config: options.config,
        flow: options.flow,
        json: options.json,
        verbose: options.verbose,
        silent: options.silent,
      });
      process.exit(0);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
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
  .option('-c, --content <json>', 'Flow.Json JSON string or file path')
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
  .option('-c, --content <json>', 'new Flow.Json JSON string or file path')
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

// deploy create [config] - placeholder until Task 2
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

// deploy start <flowId> - existing cloud deploy (unchanged logic)
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

// ── Previews ─────────────────────────────────────────────────────────────
const previewsCmd = program
  .command('previews')
  .description('Manage preview bundles for testing flow changes on live sites');

previewsCmd
  .command('list <flowId>')
  .description('List previews for a flow')
  .option('--project <projectId>', 'Project ID (overrides default)')
  .action(async (flowId, options) => {
    try {
      const { listPreviews } = await import('./commands/previews/index.js');
      const result = (await listPreviews({
        projectId: options.project,
        flowId,
      })) as { previews: unknown };
      await writeResult(JSON.stringify(result.previews, null, 2), {});
    } catch (err) {
      handleCliError(err);
    }
  });

previewsCmd
  .command('get <flowId> <previewId>')
  .description('Get preview details')
  .option('--project <projectId>', 'Project ID (overrides default)')
  .action(async (flowId, previewId, options) => {
    try {
      const { getPreview } = await import('./commands/previews/index.js');
      const result = await getPreview({
        projectId: options.project,
        flowId,
        previewId,
      });
      await writeResult(JSON.stringify(result, null, 2), {});
    } catch (err) {
      handleCliError(err);
    }
  });

previewsCmd
  .command('create <flowId>')
  .description('Create a preview bundle for a flow settings entry')
  .option('-f, --flow <name>', 'Flow settings name (resolved to ID)')
  .option('-s, --settings-id <id>', 'Flow settings ID (alternative to --flow)')
  .option('-u, --url <url>', 'Site URL to construct activation URL')
  .option('--project <projectId>', 'Project ID (overrides default)')
  .action(async (flowId, options) => {
    try {
      // Validate --url BEFORE creating the preview - otherwise an invalid URL
      // would produce a server-side preview that can't be used, wasting a
      // quota slot and forcing manual cleanup.
      if (options.url) {
        try {
          new URL(options.url);
        } catch {
          throw new Error(`Invalid --url value: ${options.url}`);
        }
      }
      const { createPreview } = await import('./commands/previews/index.js');
      const { printPreviewCreated } =
        await import('./commands/previews/output.js');
      const preview = (await createPreview({
        projectId: options.project,
        flowId,
        flowName: options.flow,
        flowSettingsId: options.settingsId,
      })) as Parameters<typeof printPreviewCreated>[0];
      printPreviewCreated(preview, { url: options.url });
    } catch (err) {
      handleCliError(err);
    }
  });

previewsCmd
  .command('delete <flowId> <previewId>')
  .description('Delete a preview')
  .option('-y, --yes', 'Skip confirmation prompt')
  .option('--project <projectId>', 'Project ID (overrides default)')
  .action(async (flowId, previewId, options) => {
    try {
      if (!options.yes) {
        throw new Error('Confirmation required. Use --yes to skip.');
      }
      const { deletePreview } = await import('./commands/previews/index.js');
      await deletePreview({
        projectId: options.project,
        flowId,
        previewId,
      });
      process.stderr.write(`Deleted ${previewId}\n`);
    } catch (err) {
      handleCliError(err);
    }
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
      flow: options.flow ?? process.env.WALKEROS_FLOW_NAME,
      flowId: options.flowId ?? process.env.WALKEROS_FLOW_ID,
      deploymentId: process.env.WALKEROS_DEPLOYMENT_ID,
      project: options.project ?? process.env.WALKEROS_PROJECT_ID,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

// Feedback command
program
  .command('feedback <text>')
  .description('Send feedback to walkerOS')
  .action(async (text) => {
    await feedbackCommand(text);
  });

// Telemetry command group
const telemetryCmd = program
  .command('telemetry')
  .description('Manage anonymous usage telemetry');

telemetryCmd
  .command('status')
  .description('Show whether telemetry is enabled or disabled')
  .action(() => telemetryStatusCommand());

telemetryCmd
  .command('enable')
  .description('Enable anonymous usage telemetry')
  .action(() => telemetryEnableCommand());

telemetryCmd
  .command('disable')
  .description('Disable anonymous usage telemetry')
  .action(() => telemetryDisableCommand());

// Cache command
registerCacheCommand(program);

// Telemetry hooks - populate cmdPath/cmdStart for action-bound commands.
program.hook('preAction', (_thisCmd, actionCmd) => {
  cmdStart = Date.now();
  // Space-joined command path: `walkeros projects list` → "projects list".
  const parts: string[] = [];
  let cur: Command | null = actionCmd;
  while (cur && cur.name() !== 'walkeros') {
    parts.unshift(cur.name());
    cur = cur.parent;
  }
  cmdPath = parts.join(' ');
});

program.hook('postAction', async () => {
  try {
    await emitter.send(
      'cmd invoke',
      { command: cmdPath, outcome: 'success' },
      Date.now() - cmdStart,
      { command: cmdPath },
    );
    telemetryEmitted = true;
  } catch {
    /* never throw from telemetry */
  }
});

// Fallback emit for paths that bypass action hooks - `--version`, `--help`,
// or subcommand-less invocations that Commander handles via `this._exit`.
// In debug mode the `send` call writes to stderr synchronously before its
// first await, so the emission is observable on exit. In production mode the
// collector already flushed for action-bound paths; for non-action paths we
// accept best-effort here.
process.on('exit', () => {
  if (telemetryEmitted) return;
  // Derive a reasonable command label from argv for paths that skipped hooks.
  const argvTail = process.argv.slice(2);
  const argvCmd =
    cmdPath ||
    argvTail.find((a) => !a.startsWith('-')) ||
    (argvTail.some((a) => a === '--version' || a === '-V')
      ? '--version'
      : '') ||
    (argvTail.some((a) => a === '--help' || a === '-h') ? '--help' : '');
  // In debug mode, send() writes to stderr synchronously before its first
  // await, so the emission is observable before process exit. In production
  // mode the abandoned promise matches our "never break the host" contract.
  void emitter
    .send(
      'cmd invoke',
      { command: argvCmd, outcome: 'success' },
      cmdStart ? Date.now() - cmdStart : 0,
      { command: argvCmd },
    )
    .catch(() => {
      /* never throw from telemetry */
    });
});

// Show banner when called without any arguments (bare `walkeros`)
if (process.argv.length <= 2) {
  printBanner(VERSION);
  console.error('Run walkeros --help for usage information.');
  process.exit(0);
}

try {
  await program.parseAsync();
} catch (err) {
  try {
    await emitter.send(
      'cmd invoke',
      { command: cmdPath || 'unknown', outcome: 'error' },
      cmdStart ? Date.now() - cmdStart : 0,
      { command: cmdPath || 'unknown' },
    );
    telemetryEmitted = true;
  } catch {
    /* never throw from telemetry */
  }
  handleCliError(err);
}
