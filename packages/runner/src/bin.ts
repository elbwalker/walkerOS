import { Command } from 'commander';
import { VERSION } from './version.js';
import { runCommand } from './run.js';

const program = new Command();

program
  .name('runneros')
  .description(
    'Run prebuilt walkerOS flow artifacts. Build them with `walkeros bundle`.',
  )
  .version(VERSION);

program
  .command('start [artifact]')
  .description(
    'Start a prebuilt flow artifact (.mjs, .js, .cjs, .tar.gz, an http(s) URL, or stdin)',
  )
  .option('--flow-id <id>', 'API flow ID (enables heartbeat and secrets)')
  .option('--project <id>', 'project ID (defaults to WALKEROS_PROJECT_ID)')
  .option('-p, --port <number>', 'port to listen on (default: 8080)', parseInt)
  .option(
    '--env-file <path>',
    'load environment variables from a dotenv file (opt-in; existing env wins; refuses group/other-readable files)',
  )
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (artifact, options) => {
    await runCommand({
      config: artifact || process.env.BUNDLE,
      port:
        options.port ??
        (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined),
      flowId: options.flowId ?? process.env.WALKEROS_FLOW_ID,
      deploymentId: process.env.WALKEROS_DEPLOYMENT_ID,
      project: options.project ?? process.env.WALKEROS_PROJECT_ID,
      envFile: options.envFile,
      json: options.json,
      verbose: options.verbose,
      silent: options.silent,
    });
  });

await program.parseAsync();
