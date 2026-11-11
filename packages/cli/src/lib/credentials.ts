import {
  closeSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'fs';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { z } from 'zod';
import {
  ensureConfigDir,
  getConfigDir,
  writePrivateFile,
} from './config-file.js';

/**
 * Where `walkeros login` keeps what it signed in with, beside `config.json`:
 *
 * - `credentials.json`, one login per issuer (`{ "<issuer>": {...} }`), so a
 *   person can stay signed in to stage and prod at once. Each login keeps the
 *   endpoints discovered when it was made, and a refresh or a revocation goes
 *   only to those, never to endpoints discovered again from whatever app URL
 *   is set later.
 * - `pending-<state>.json`, one per `walkeros login --no-browser` run without
 *   a terminal, waiting for `walkeros login --code`.
 * - `credentials.lock`, held around every read-refresh-write and every write
 *   of `credentials.json`, so two commands never present one refresh token
 *   twice (the app ends the whole sign-in when one is replayed).
 *
 * Every file is created exclusively with mode 0600 (`writePrivateFile`).
 */

export const LoginSchema = z.object({
  issuer: z.string(),
  client_id: z.string(),
  token_endpoint: z.string(),
  revocation_endpoint: z.string(),
  access_token: z.string(),
  /** Epoch milliseconds. */
  expires_at: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});
export type StoredLogin = z.infer<typeof LoginSchema>;

const CredentialsSchema = z.record(z.string(), z.unknown());

export type Credentials = Record<string, StoredLogin>;

export function getCredentialsPath(): string {
  return join(getConfigDir(), 'credentials.json');
}

function getLockPath(): string {
  return join(getConfigDir(), 'credentials.lock');
}

/**
 * Every stored login, keyed by issuer. A login whose key is not its issuer, or
 * that does not parse, is left out: it is never sent anywhere.
 */
export function readCredentials(): Credentials {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(getCredentialsPath(), 'utf-8'));
  } catch {
    return {};
  }
  const parsed = CredentialsSchema.safeParse(raw);
  if (!parsed.success) return {};
  const logins: Credentials = {};
  for (const [issuer, value] of Object.entries(parsed.data)) {
    const login = LoginSchema.safeParse(value);
    if (login.success && login.data.issuer === issuer)
      logins[issuer] = login.data;
  }
  return logins;
}

/** Replace `credentials.json`. Call it only while holding `withCredentialsLock`. */
export function writeCredentials(logins: Credentials): void {
  ensureConfigDir();
  writePrivateFile(getCredentialsPath(), JSON.stringify(logins, null, 2));
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * The stored login an app URL may use: the one whose issuer has the app URL's
 * origin. A login is never attached to a request for another origin.
 */
export function loginForAppUrl(
  logins: Credentials,
  appUrl: string,
): StoredLogin | undefined {
  const origin = originOf(appUrl);
  if (origin === null) return undefined;
  const exact = logins[appUrl.replace(/\/+$/, '')];
  if (exact) return exact;
  return Object.values(logins).find(
    (login) => originOf(login.issuer) === origin,
  );
}

// === The lock ===

export class CredentialsBusyError extends Error {}

export interface LockTiming {
  /** How long to wait for another command's lock. */
  waitMs: number;
  /** A lock older than this was left by a command that died, and is broken. */
  staleMs: number;
  pollMs: number;
}

/**
 * 15 seconds of waiting, and 30 before a lock counts as left behind: a live
 * holder's refresh request times out after 10, so it never comes near it.
 */
export const LOCK_TIMING: LockTiming = {
  waitMs: 15_000,
  staleMs: 30_000,
  pollMs: 100,
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function isErrnoCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function tryCreateLock(path: string, mark: string): boolean {
  let fd: number;
  try {
    fd = openSync(path, 'wx', 0o600);
  } catch (error) {
    if (isErrnoCode(error, 'EEXIST')) return false;
    throw error;
  }
  try {
    writeSync(fd, mark);
  } finally {
    closeSync(fd);
  }
  return true;
}

function readLock(path: string): { mark: string; ageMs: number } | null {
  try {
    const ageMs = Date.now() - statSync(path).mtimeMs;
    return { mark: readFileSync(path, 'utf-8'), ageMs };
  } catch {
    return null;
  }
}

/**
 * Run `fn` holding `credentials.lock`. The lock file holds the pid, the time
 * and a random mark, so only its own holder removes it.
 */
export async function withCredentialsLock<T>(
  fn: () => Promise<T>,
  timing: LockTiming = LOCK_TIMING,
): Promise<T> {
  const dir = ensureConfigDir();
  const path = getLockPath();
  const mark = `${process.pid} ${new Date().toISOString()} ${randomBytes(8).toString('hex')}`;
  const deadline = Date.now() + timing.waitMs;
  for (;;) {
    if (tryCreateLock(path, mark)) break;
    const held = readLock(path);
    if (held && held.ageMs > timing.staleMs) {
      // Read it once more right before removing it, so a lock another command
      // just took in its place is left alone.
      const again = readLock(path);
      if (again && again.mark === held.mark) {
        try {
          unlinkSync(path);
        } catch {
          // Another command broke it first.
        }
      }
      continue;
    }
    if (Date.now() >= deadline)
      throw new CredentialsBusyError(
        `another walkeros command is updating the sign-in in ${dir}: try again`,
      );
    await sleep(timing.pollMs);
  }
  try {
    return await fn();
  } finally {
    const held = readLock(path);
    if (held && held.mark === mark) {
      try {
        unlinkSync(path);
      } catch {
        // Already gone.
      }
    }
  }
}

// === Pending sign-ins (walkeros login --no-browser without a terminal) ===

/**
 * The 10 minutes the app keeps the consent request open plus the 5 a code
 * lives after Allow: a person may take minutes to sign in on the other device.
 */
export const PENDING_TTL_MS = 15 * 60 * 1000;

export const STATE_SHAPE = /^[A-Za-z0-9_-]{1,128}$/;

export const PendingSchema = z.object({
  code_verifier: z.string(),
  state: z.string().regex(STATE_SHAPE),
  redirect_uri: z.string(),
  issuer: z.string(),
  client_id: z.string(),
  token_endpoint: z.string(),
  /** Epoch milliseconds. */
  created_at: z.number(),
});
export type PendingLogin = z.infer<typeof PendingSchema>;

const PENDING_FILE = /^pending-([A-Za-z0-9_-]{1,128})\.json$/;

function pendingPath(state: string): string {
  if (!STATE_SHAPE.test(state)) throw new Error('state is not base64url');
  return join(getConfigDir(), `pending-${state}.json`);
}

export function writePending(pending: PendingLogin): void {
  ensureConfigDir();
  writePrivateFile(
    pendingPath(pending.state),
    JSON.stringify(pending, null, 2),
  );
}

/** The pending sign-in for a state, or null when there is none or it does not parse. */
export function readPending(state: string): PendingLogin | null {
  try {
    const parsed = PendingSchema.safeParse(
      JSON.parse(readFileSync(pendingPath(state), 'utf-8')),
    );
    return parsed.success && parsed.data.state === state ? parsed.data : null;
  } catch {
    return null;
  }
}

export function deletePending(state: string): void {
  try {
    unlinkSync(pendingPath(state));
  } catch {
    // Already gone.
  }
}

export function isPendingExpired(
  pending: PendingLogin,
  now = Date.now(),
): boolean {
  return now - pending.created_at > PENDING_TTL_MS;
}

/** Remove every pending sign-in older than its life (or unreadable). */
export function removeExpiredPending(now = Date.now()): void {
  let names: string[];
  try {
    names = readdirSync(getConfigDir());
  } catch {
    return;
  }
  for (const name of names) {
    const match = PENDING_FILE.exec(name);
    if (!match) continue;
    const pending = readPending(match[1]);
    if (pending === null || isPendingExpired(pending, now))
      deletePending(match[1]);
  }
}
