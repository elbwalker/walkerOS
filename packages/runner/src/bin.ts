import { Command } from 'commander';
import { getErrorMessage } from '@walkeros/core';
import { createCLILogger } from '@walkeros/core/node';
import { VERSION } from './version.js';
import { runCommand } from './run.js';
import { resolveStartOptions, type StartFlags } from './start-options.js';
import { runRemote } from './remote/command.js';
import {
  resolveRemoteOptions,
  type RemoteFlags,
  type RemoteOptions,
} from './remote/options.js';
import { RUNTIME_COLORS } from './runtime-logging.js';

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

program
  .command('remote')
  .description(
    'Run the releases the walkerOS app hands this runner, each checked before it runs',
  )
  .option('--cache <dir>', 'release cache folder (required)')
  .option('--no-heartbeat', 'send no counters, errors or lines in the check-in')
  .option(
    '--heap <MB>',
    'heap of the flow in MB (default: from the memory granted)',
  )
  .option('-p, --port <number>', 'port to listen on (default: 8080)', parseInt)
  .option('--json', 'output as JSON')
  .option('-v, --verbose', 'verbose output')
  .option('-s, --silent', 'suppress output')
  .action(async (flags: RemoteFlags) => {
    let options: RemoteOptions;
    try {
      options = resolveRemoteOptions(flags, process.env);
    } catch (error) {
      createCLILogger({}, RUNTIME_COLORS).error(getErrorMessage(error));
      return process.exit(1);
    }
    await runRemote(options);
  });

await program.parseAsync();
