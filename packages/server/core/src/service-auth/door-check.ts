import { createHash } from 'node:crypto';
import type { PublicEcJwk } from '@walkeros/core';
import type { DoorTag } from './door-sign';
import type { SignatureRefusal } from './signature';
import { verifyRequestSignature } from './signature';

/** Why a door refused a request. */
export type DoorRefusal =
  | SignatureRefusal
  | 'missing'
  | 'unknown-key'
  | 'created-ahead'
  | 'replay';

/** A door's answer to one request: pass it, refuse it (403), or ask for a retry (503). */
export type DoorDecision =
  | { ok: true; keyid: string }
  | { ok: false; status: 403; reason: DoorRefusal }
  | {
      ok: false;
      status: 503;
      retryAfter: 5 | 1;
      reason: 'unknown-key' | 'created-before-start' | 'replay-store-full';
    };

export interface DoorCheckOptions {
  tag: DoorTag;
  /** The public key for a keyid, or undefined when the door holds none. */
  lookup: (keyid: string) => Promise<PublicEcJwk | undefined>;
  /** Asks for newer keys; the check waits for it at most 2 seconds. */
  refresh?: () => Promise<void>;
  /** When the door started, in ms since the epoch. */
  startedAt: number;
  /** ms since the epoch, as `Date.now()`. */
  now?: () => number;
}

export interface DoorRequest {
  /** The door's own origin, never one the request names (no `Host`). */
  origin: string;
  method: string;
  /** The raw request target, origin-form: path and query. */
  target: string;
  headers: Headers;
  /** The exact body bytes the door holds. */
  body: Uint8Array;
}

export interface DoorCheck {
  check(request: DoorRequest): Promise<DoorDecision>;
}

/** The fixed caps that bound the door's memory whatever a sender sends. */
export interface DoorLimits {
  /** Keyids the lookup was asked for, least recently used out first. */
  keyids: number;
  /** Live `(keyid, nonce)` entries; a full store evicts nothing. */
  replays: number;
}

export const DOOR_LIMITS: DoorLimits = { keyids: 4_096, replays: 65_536 };

/** A signature's `created` may run at most this far ahead of the door's clock. */
const MAX_AHEAD_MS = 5_000;
const MAX_AGE_SECONDS = 60;
/** Longer than any `created` the door takes (5 s ahead to 60 s behind). */
const REPLAY_WINDOW_MS = 120_000;
/** A keyid no key was ever found for gets 503s this long, for a new pairing's first keys. */
const NEW_KEY_WINDOW_MS = 600_000;
const REFRESH_WAIT_MS = 2_000;

const refuse = (reason: DoorRefusal): DoorDecision => ({
  ok: false,
  status: 403,
  reason,
});

interface Sighting {
  firstSeen: number;
  answered: boolean;
}

/** Every map key is a SHA-256, so each entry has one size whatever was sent. */
function hashed(...parts: string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part).update('\n');
  return hash.digest('base64');
}

/**
 * The check a data plane's door runs on each signed request, in this order:
 * the three headers present; an origin-form target on the door's origin; the
 * checks that need no key (inside the one parse, before any lookup); the
 * signature with the door's key lookup; an unknown keyid (403 once the lookup
 * has answered it, else 503 for 10 minutes from its first sight); `created`
 * at most 5 seconds ahead and not before the door started; and the replay
 * store. It never logs and no reason carries a header value.
 */
export function createDoorCheck(options: DoorCheckOptions): DoorCheck {
  return createDoorCheckWithLimits(options, DOOR_LIMITS);
}

/** `createDoorCheck` with other caps, so a test can fill them. */
export function createDoorCheckWithLimits(
  options: DoorCheckOptions,
  limits: DoorLimits,
): DoorCheck {
  const { tag, lookup, refresh, startedAt } = options;
  const now = options.now ?? Date.now;
  const sightings = new Map<string, Sighting>();
  /** Hashed `(keyid, nonce)` to the time it may be taken again; insertion order is time order. */
  const replays = new Map<string, number>();

  function sighted(keyid: string): Sighting {
    const id = hashed(keyid);
    const known = sightings.get(id);
    if (known) sightings.delete(id);
    const sighting = known ?? { firstSeen: now(), answered: false };
    sightings.set(id, sighting);
    if (sightings.size > limits.keyids) {
      const oldest = sightings.keys().next();
      if (!oldest.done) sightings.delete(oldest.value);
    }
    return sighting;
  }

  async function refreshed(): Promise<void> {
    if (!refresh) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const waited = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, REFRESH_WAIT_MS);
      timer.unref();
    });
    // The refresh's own failure is its owner's to report; the check goes on.
    const asked = new Promise<void>((resolve) => resolve(refresh())).catch(
      () => undefined,
    );
    try {
      await Promise.race([asked, waited]);
    } finally {
      clearTimeout(timer);
    }
  }

  function sweep(at: number): void {
    for (const [id, until] of replays) {
      if (until > at) break;
      replays.delete(id);
    }
  }

  return {
    async check(request) {
      const { headers } = request;
      if (
        !headers.has('signature-input') ||
        !headers.has('signature') ||
        !headers.has('content-digest')
      )
        return refuse('missing');

      // Origin-form only: a target such as `@other.example/x` would move the
      // URL to another origin, whose signatures the door must never take.
      if (!request.target.startsWith('/')) return refuse('malformed');
      const url = `${new URL(request.origin).origin}${request.target}`;

      let sighting: Sighting | undefined;
      const verified = await verifyRequestSignature({
        method: request.method,
        url,
        headers,
        body: request.body,
        tag,
        now: now(),
        maxAgeSeconds: MAX_AGE_SECONDS,
        key: async (keyid) => {
          sighting = sighted(keyid);
          let key = await lookup(keyid);
          if (!key && refresh) {
            await refreshed();
            key = await lookup(keyid);
          }
          if (key) sighting.answered = true;
          return key;
        },
      });

      if (!verified.ok) {
        if (verified.reason !== 'unknown-key' || !sighting || sighting.answered)
          return refuse(verified.reason);
        if (now() - sighting.firstSeen < NEW_KEY_WINDOW_MS)
          return {
            ok: false,
            status: 503,
            retryAfter: 5,
            reason: 'unknown-key',
          };
        return refuse('unknown-key');
      }

      const at = now();
      if (verified.created * 1000 - at > MAX_AHEAD_MS)
        return refuse('created-ahead');
      // A request signed before the start may be one the door took before it,
      // since the replay store starts empty; a retry signs anew and passes.
      if (verified.created * 1000 < startedAt)
        return {
          ok: false,
          status: 503,
          retryAfter: 1,
          reason: 'created-before-start',
        };

      sweep(at);
      const id = hashed(verified.keyid, verified.nonce);
      const until = replays.get(id);
      if (until !== undefined && until > at) return refuse('replay');
      if (until !== undefined) replays.delete(id);
      // Evicting a live entry would let its replay pass.
      if (replays.size >= limits.replays)
        return {
          ok: false,
          status: 503,
          retryAfter: 1,
          reason: 'replay-store-full',
        };
      replays.set(id, at + REPLAY_WINDOW_MS);
      return { ok: true, keyid: verified.keyid };
    },
  };
}
