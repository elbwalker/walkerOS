/**
 * The `runneros remote` flags as commander parses them, and the options the
 * command runs with. There is no artifact and no env file: the releases come
 * from the app, and a self-hosted runner's server secrets come from the
 * platform's own environment, one source per name.
 */

import path from 'path';
import { validatePort } from '../validators.js';
import { MIN_HEAP_MB } from './memory.js';

export interface RemoteFlags {
  /** Required; commander leaves it out when the flag is missing. */
  cache?: string;
  /** False with `--no-heartbeat`. */
  heartbeat: boolean;
  /** As written: checked here, so a refusal names the value given. */
  heap?: string;
  port?: number;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

export interface RemoteOptions {
  cacheDir: string;
  heartbeat: boolean;
  heapMb?: number;
  port: number;
  json?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

function heapOf(written: string): number {
  if (!/^\d+$/.test(written))
    throw new Error(`--heap ${written} is not a whole number of MB`);
  const mb = Number(written);
  if (mb < MIN_HEAP_MB)
    throw new Error(`--heap ${written} is below the ${MIN_HEAP_MB} MB minimum`);
  return mb;
}

/**
 * The options of a `runneros remote` run: the cache folder made absolute,
 * the heap checked, the port from `-p`, else `PORT`, else 8080. Nothing
 * else in `env` is read here.
 */
export function resolveRemoteOptions(
  flags: RemoteFlags,
  env: NodeJS.ProcessEnv,
): RemoteOptions {
  if (!flags.cache) throw new Error('--cache is not set');
  const heapMb = flags.heap === undefined ? undefined : heapOf(flags.heap);
  const port =
    flags.port ?? (env.PORT !== undefined ? parseInt(env.PORT, 10) : 8080);
  validatePort(port);
  return {
    cacheDir: path.resolve(flags.cache),
    heartbeat: flags.heartbeat,
    ...(heapMb !== undefined && { heapMb }),
    port,
    ...(flags.json !== undefined && { json: flags.json }),
    ...(flags.verbose !== undefined && { verbose: flags.verbose }),
    ...(flags.silent !== undefined && { silent: flags.silent }),
  };
}
