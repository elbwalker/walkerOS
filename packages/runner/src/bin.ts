import { Command } from 'commander';
import { VERSION } from './version.js';
import { runCommand } from './run.js';
import { resolveStartOptions, type StartFlags } from './start-options.js';

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
    'Start a prebuilt flow artifact (.mjs, .js, .cjs, .tar.gz, .tgz, or an http(s) URL to one)',
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
  .action(async (artifact: string | undefined, flags: StartFlags) => {
    await runCommand(resolveStartOptions(artifact, flags));
  });

await program.parseAsync();
