import type { Destination } from './types';

/**
 * Env key under which the collector injects the observe-mode call recorder
 * (`Destination.EnvObserve`) into a per-push env. The resolution-point wrapper
 * strips this key before handing the env to the destination.
 */
export const OBSERVE_ENV_KEY = 'observe' as const;

/**
 * Structural guard for `Destination.EnvObserve`: an object whose `paths` is a
 * string array and whose `record` is a function. Extra keys are tolerated.
 */
export function isEnvObserve(value: unknown): value is Destination.EnvObserve {
  if (typeof value !== 'object' || value === null) return false;
  if (!('paths' in value) || !('record' in value)) return false;
  const { paths, record } = value;
  return (
    Array.isArray(paths) &&
    paths.every((path) => typeof path === 'string') &&
    typeof record === 'function'
  );
}

/**
 * Prefix marking a dot-path as a recordable call. Only this literal prefix is
 * stripped; a `<word>:` that is not `call:` stays part of the path (`wrapEnv`
 * parity).
 */
const CALL_PREFIX = 'call:';

/**
 * Parse a `simulation`/`calls` dot-path into segments, sharing one grammar with
 * `wrapEnv` so the two capture layers cannot drift. Strips a single leading
 * `call:` prefix (only the literal `call:`, never any other `<word>:`), then
 * splits on `.`. An empty path or any empty segment (leading, trailing, or
 * consecutive dots) is unresolvable and yields `[]`.
 */
export function parseCallPath(raw: string): string[] {
  const path = raw.startsWith(CALL_PREFIX)
    ? raw.slice(CALL_PREFIX.length)
    : raw;
  const segments = path.split('.');
  if (segments.some((segment) => segment === '')) return [];
  return segments;
}
