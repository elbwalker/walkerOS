import { closeSync, mkdirSync, openSync, statSync, unlinkSync } from 'fs';
import { getConfigDir, getConfigPath } from './config-file.js';

/**
 * A lock older than this is treated as abandoned. It bounds the damage a
 * process killed mid-refresh can do: without it, one crash leaves every later
 * command waiting for a holder that will never return.
 */
const STALE_MS = 15_000;

/** Gap between acquire attempts. */
const RETRY_MS = 100;

/** How long to keep trying before giving up on a lock somebody else holds. */
const TIMEOUT_MS = 10_000;

/** Path of the lock guarding the config file. */
export function getConfigLockPath(): string {
  return `${getConfigPath()}.lock`;
}

function hasCode(value: unknown): value is { code: unknown } {
  return typeof value === 'object' && value !== null && 'code' in value;
}

/**
 * Matched on the `code` property rather than on `instanceof Error`, which is
 * unreliable across realm boundaries (a test runner's module sandbox is one).
 */
function isAlreadyLocked(error: unknown): boolean {
  return hasCode(error) && error.code === 'EEXIST';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Remove the lock when its holder has clearly gone away. Returns whether the
 * lock was removed, so the caller can retry immediately rather than sleeping.
 */
function breakIfStale(lockPath: string): boolean {
  try {
    const age = Date.now() - statSync(lockPath).mtimeMs;
    if (age < STALE_MS) return false;
    unlinkSync(lockPath);
    return true;
  } catch {
    // Gone between the stat and the unlink, or never there: either way the
    // next acquire attempt is the answer.
    return false;
  }
}

/**
 * Run `fn` while holding an exclusive lock on the config file.
 *
 * Several walkerOS processes can share one config (a shell, an editor's MCP
 * server, a watch loop). Without a lock, two of them noticing an expired
 * access token at the same moment would both spend the single-use refresh
 * token, and the loser's rotation would invalidate the winner's session.
 *
 * The lock is a file created with `O_EXCL`, which is atomic on every platform
 * the CLI runs on and needs no daemon.
 */
export async function withConfigLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockPath = getConfigLockPath();
  mkdirSync(getConfigDir(), { recursive: true, mode: 0o700 });

  const deadline = Date.now() + TIMEOUT_MS;

  for (;;) {
    let handle: number;
    try {
      handle = openSync(lockPath, 'wx', 0o600);
    } catch (error) {
      if (!isAlreadyLocked(error)) throw error;
      if (breakIfStale(lockPath)) continue;
      if (Date.now() >= deadline) {
        throw new Error(
          `Timed out waiting for the walkerOS config lock at ${lockPath}. ` +
            'Remove the file if no other walkeros process is running.',
        );
      }
      await delay(RETRY_MS);
      continue;
    }

    closeSync(handle);
    try {
      return await fn();
    } finally {
      try {
        unlinkSync(lockPath);
      } catch {
        // Another process broke the lock as stale while we held it. Nothing to
        // release, and failing here would mask the callback's own result.
      }
    }
  }
}
