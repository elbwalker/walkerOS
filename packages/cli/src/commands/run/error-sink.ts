/**
 * Durable error sink boot helpers.
 *
 * The runner persists each first-seen error to `<cacheDir>/errors.jsonl`
 * synchronously (see `ErrorRing.setSink`) so a crash between heartbeats does not
 * lose the failure. On the next boot, this module reads that file, seeds the
 * messages back into the ring (so the first heartbeat re-reports the pre-crash
 * error), then truncates the file so the same errors are not re-shipped on every
 * subsequent boot.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ErrorRing } from '../../runtime/index.js';

/** Resolve the durable jsonl path inside a cache directory. */
export function errorSinkPath(cacheDir: string): string {
  return join(cacheDir, 'errors.jsonl');
}

/**
 * Ensure the cache directory exists so the synchronous jsonl append can succeed.
 *
 * A managed runner container boots with a prebuilt bundle (Case 1) and refuses
 * to self-bundle, so `writeCache` (the only other dir creator) never runs. On a
 * fresh container the dir would be missing, so every `appendFileSync` in
 * `ErrorRing.persist` would throw ENOENT into its swallowed catch and durable
 * persistence would silently never happen in the exact deployment it targets.
 * Best-effort: a failed mkdir leaves persistence disabled (the append swallow
 * keeps the ring working either way).
 */
export function ensureSinkDir(cacheDir: string): void {
  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {
    // Best-effort: persistence disabled if the dir cannot be created.
  }
}

interface PersistedError {
  message: string;
  firstSeen: number;
}

function isPersistedError(value: unknown): value is PersistedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string' &&
    'firstSeen' in value &&
    typeof value.firstSeen === 'number'
  );
}

/**
 * Read any existing `errors.jsonl` at `sinkPath`, seed each valid record into
 * `ring`, then truncate the file. Best-effort: a missing or corrupt file is
 * ignored, and individual unparseable lines are skipped. Truncation only runs
 * when at least one line was read, so a missing file leaves nothing behind.
 */
export function seedErrorRingFromJsonl(
  ring: ErrorRing,
  sinkPath: string,
): void {
  let raw: string;
  try {
    raw = readFileSync(sinkPath, 'utf-8');
  } catch {
    return; // missing file (or unreadable): nothing to ship
  }

  const lines = raw.split('\n').filter((line) => line.length > 0);
  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (isPersistedError(parsed)) {
        ring.seed(parsed.message, parsed.firstSeen);
      }
    } catch {
      // Skip a corrupt line; keep seeding the rest.
    }
  }

  // Truncate so these errors are not re-shipped on the next boot.
  try {
    writeFileSync(sinkPath, '');
  } catch {
    // Best-effort: if truncation fails the only cost is a re-ship next boot.
  }
}
