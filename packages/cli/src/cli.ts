import { Command, Option } from 'commander';
import { VERSION } from './version.js';
import { setClientContext } from './core/client-context.js';
import { handleCliError } from './core/api-error.js';
import { printBanner } from './core/banner.js';
import { createEmitter } from './telemetry/index.js';
import { bundleCommand } from './commands/bundle/index.js';
import {
  bundleManifestCommand,
  manifestFlagConflicts,
} from './commands/bundle/manifest.js';
import { pushCommand } from './commands/push/index.js';
import { setupCommand } from './commands/setup/index.js';
import { validateCommand } from './commands/validate/index.js';
import { registerCacheCommand } from './commands/cache.js';
import { loginCommand } from './commands/login/index.js';
import { logoutCommand } from './commands/logout/index.js';
import { authTokenCommand, whoamiCommand } from './commands/auth/index.js';
import { registerApiCommand } from './commands/api/index.js';
import { diagnosticsCommand } from './commands/diagnostics/index.js';
import {
  telemetryStatusCommand,
  telemetryEnableCommand,
  telemetryDisableCommand,
} from './commands/telemetry/index.js';

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
  .description(
    'Bundle a flow.json. Server flows produce dist/{flow.mjs,package.json,node_modules/} via @vercel/nft tracing; web flows produce a single walker.js.',
  )
  .option('-o, --output <path>', 'write bundle to file or directory')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('--all', 'build all flows for multi-flow configs')
  .option('--stats', 'show bundle statistics')
  .option('--json', 'output as JSON (implies --stats)')
  .option('--no-cache', 'disable package caching')
  .option(
    '--release <id>',
    'config release id baked into config.collector.release (stamped on event.source.release)',
  )
  .option(
    '--manifest [source]',
    'build from a manifest (URL or path; bare flag reads BUILD_MANIFEST_URL), PUT outputs and a result',
  )
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (file, options) => {
    if (options.manifest !== undefined) {
      const conflicts = manifestFlagConflicts(file, options);
      if (conflicts.length > 0) {
        throw new Error(
          `--manifest cannot be combined with ${conflicts.join(', ')}; only --json, --verbose and --silent apply`,
        );
      }
      await bundleManifestCommand({
        manifest: options.manifest,
        json: options.json,
        verbose: options.verbose,
        silent: options.silent,
      });
      return;
    }
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
      release: options.release,
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
  .option(
    '--ingest <source>',
    'pipeline context for a simulated transformer, collector or destination (JSON object, file path, or URL)',
  )
  .option(
    '--consent <source>',
    'starting collector consent for a simulation, any step (JSON object of booleans, file path, or URL)',
  )
  .addOption(
    new Option(
      '--command <name>',
      'simulated destination runs this collector command with the event as its data, instead of a push',
    ).choices(['config', 'consent', 'user', 'run']),
  )
  .option(
    '--page-url <url>',
    'page URL of a simulated web source (absolute URL; default: the example trigger url, else http://localhost)',
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
      ingestSource: options.ingest,
      consentSource: options.consent,
      command: options.command,
      pageUrl: options.pageUrl,
    });
  });

// Setup command
// Note: positional arg is `<target>` (component selector like
// `destination.NAME`), not `[file]`. The flow config path comes from
// `-c/--config`.
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
    await setupCommand({
      target,
      config: options.config,
      flow: options.flow,
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
    'validate one entry against its package schema in every flow that has it, or only in --flow (e.g. destinations.snowplow, stores.cache)',
  )
  .option('-o, --output <path>', 'write result to file')
  .option('-f, --flow <name>', 'flow name for multi-flow configs')
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .option('--strict', 'fail on warnings and skipped checks')
  .option(
    '--offline',
    'do not fetch package schemas; step settings are not checked against them',
  )
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
      offline: options.offline,
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

authCmd
  .command('token')
  .description('Print the current access token, for any HTTP client')
  .action(async () => {
    process.exitCode = await authTokenCommand();
  });

// Any app API operation, by method and path
registerApiCommand(program);

// Diagnostics command
program
  .command('diagnostics')
  .description(
    'Show the CLI version, the app URL and its source, and whether the app answers',
  )
  .option('--json', 'output as JSON')
  .action(async (options) => {
    await diagnosticsCommand({ json: options.json });
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
  // Space-joined command path: `walkeros auth login` → "auth login".
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
    // A command that reports failure through the exit code returns normally.
    await emitter.send(
      'cmd invoke',
      { command: cmdPath, outcome: process.exitCode ? 'error' : 'success' },
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
