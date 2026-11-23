import { loadEnvFile } from './env-file.js';
import type { RunCommandOptions } from './types.js';

/** The `runneros start` flags as commander parses them. */
export interface StartFlags {
  port?: number;
  envFile?: string;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

/**
 * Turn the `start` argument and flags into run options. The opt-in
 * `--env-file` is loaded FIRST, exactly once, so its values reach every env
 * fallback read below (BUNDLE, PORT) as well as the credential and `$env`
 * reads that happen later. Existing process.env keys still win over the file.
 */
export function resolveStartOptions(
  artifact: string | undefined,
  flags: StartFlags,
): RunCommandOptions {
  if (flags.envFile) loadEnvFile(flags.envFile);

  return {
    config: artifact || process.env.BUNDLE,
    port:
      flags.port ??
      (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined),
    json: flags.json,
    verbose: flags.verbose,
    silent: flags.silent,
  };
}
