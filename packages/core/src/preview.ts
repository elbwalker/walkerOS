/** Claims carried by an activation grant. See the preview-sessions design spec. */
export interface ActivationGrant {
  /** Issuing environment, e.g. 'app:stage'. Verifier rejects a foreign issuer. */
  iss: string;
  /** Exact origins this grant may activate on. Exact-membership match only. */
  aud: string[];
  /** Issue time, epoch seconds. The URL window is enforced against this. */
  iat: number;
  /** Session expiry, epoch seconds. Storage-sourced grants are rejected after it. */
  sxp: number;
  /** Opaque artifact id: the preview bundle is `preview/<art>.js`. */
  art: string;
  /** Subresource integrity of the artifact bytes, e.g. 'sha384-…'. */
  sri: string;
  /** Opaque per-project binding. Must equal the value baked into the host bundle. */
  pb: string;
  /** Capability. Only 'activate' exists today. */
  cap: 'activate';
  /** Per-grant unique id, for audit and revocation. */
  jti: string;
  /** Preview id, for correlation. Never a project id. */
  pid: string;
  /** Session id, present only on cross-part (web+server) grants. */
  ses?: string;
  /** Opaque per-session binding. Present iff `ses` is. */
  sb?: string;
}

export type PreviewFailure =
  | 'no-grant'
  | 'malformed'
  | 'kid-mismatch'
  | 'bad-signature'
  | 'foreign-issuer'
  | 'expired'
  | 'aud-mismatch'
  | 'pb-mismatch'
  | 'sb-mismatch'
  | 'cap-mismatch'
  | 'no-subtle'
  | 'swap-failed';

export interface ParsedGrant {
  grant: ActivationGrant;
  kid: string;
  /** The exact bytes covered by the signature: `${header}.${payload}` as UTF-8. */
  signed: Uint8Array;
  /** Raw r‖s signature, 64 bytes. */
  signature: Uint8Array;
}

export type VerifyResult =
  | { ok: true; grant: ActivationGrant }
  | { ok: false; reason: PreviewFailure };

// Base64url alphabet, no padding: shared by every JWS segment decode below
// and by isGrant's `art` check, since `art` is interpolated into a URL path
// and must never carry '.', '/' or other path-traversal characters even
// though it is not itself base64url-decoded.
const JWS_SEGMENT_CHARSET = /^[A-Za-z0-9_-]+$/;

function decodeSegment(segment: string): Uint8Array | null {
  if (!JWS_SEGMENT_CHARSET.test(segment)) return null;
  const pad =
    segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4));
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/') + pad;
  // atob is untyped in core (no DOM lib, no own @types/node) but present in
  // every runtime we target (browsers, Node >=16, jsdom): structural access.
  const atobFn = (globalThis as { atob?: (data: string) => string }).atob;
  if (!atobFn) return null;
  try {
    const binary = atobFn(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// Core ships without TextEncoder/TextDecoder (no DOM lib, jsdom lacks them,
// see batchedPoster.ts). The grant protocol is ASCII by contract: mint
// \u-escapes non-ASCII in the JSON payload, so any byte >0x7F is malformed.
function bytesToAscii(bytes: Uint8Array): string | null {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === undefined || c > 0x7f) return null;
    out += String.fromCharCode(c);
  }
  return out;
}

// The JWS signing input (`base64url.base64url`) is inherently ASCII.
function asciiToBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  return bytes;
}

function decodeJson(segment: string): unknown {
  const bytes = decodeSegment(segment);
  if (!bytes) return null;
  const text = bytesToAscii(bytes);
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGrant(value: unknown): value is ActivationGrant {
  if (!isRecord(value)) return false;
  const g = value;
  return (
    typeof g.iss === 'string' &&
    Array.isArray(g.aud) &&
    g.aud.every((a) => typeof a === 'string') &&
    typeof g.iat === 'number' &&
    typeof g.sxp === 'number' &&
    typeof g.art === 'string' &&
    // Same-origin path traversal guard: `art` is interpolated into
    // `/preview/${art}.js`. The fixed `previewOrigin` authority already stops
    // a hostile `art` from leaving this origin, but without this charset
    // check a signed grant could still smuggle '../' into the request path.
    JWS_SEGMENT_CHARSET.test(g.art) &&
    typeof g.sri === 'string' &&
    typeof g.pb === 'string' &&
    g.cap === 'activate' &&
    typeof g.jti === 'string' &&
    typeof g.pid === 'string' &&
    (g.ses === undefined || typeof g.ses === 'string') &&
    (g.sb === undefined || typeof g.sb === 'string')
  );
}

/**
 * Parse a compact JWS activation grant. Pure and synchronous: this is the cheap
 * gate that runs before any crypto is touched. Returns null on anything
 * malformed: callers treat null as "ignore, do not clear existing state".
 */
export function parseGrant(raw: string): ParsedGrant | null {
  if (!raw) return null;
  const parts = raw.split('.');
  const [headerSeg, payloadSeg, sigSeg] = parts;
  if (parts.length !== 3 || !headerSeg || !payloadSeg || !sigSeg) return null;

  const header = decodeJson(headerSeg);
  if (!isRecord(header)) return null;
  const kid = header.kid;
  const alg = header.alg;
  if (typeof kid !== 'string' || alg !== 'ES256') return null;

  const payload = decodeJson(payloadSeg);
  if (!isGrant(payload)) return null;

  const signature = decodeSegment(sigSeg);
  if (!signature || signature.byteLength !== 64) return null;

  return {
    grant: payload,
    kid,
    signed: asciiToBytes(`${headerSeg}.${payloadSeg}`),
    signature,
  };
}

/** A public key a bundle or container will accept grants from. */
export interface PreviewKey {
  kid: string;
  /** base64url-encoded P-256 SPKI. */
  spki: string;
}

// Node's real SubtleCrypto splits importKey into a 'jwk' overload and a
// non-'jwk' one, each with its own keyData type. A plain `Uint8Array`
// parameter here makes TS's overload matching pick the incompatible 'jwk'
// overload and report a false mismatch; this wider union (matching the
// shape of Node's own BufferSource) resolves against the right overload
// while still accepting a plain Uint8Array at every call site.
type PreviewBinary = ArrayBuffer | ArrayBufferView;

/**
 * Structural slice of WebCrypto used by the verifier. Core compiles without
 * the DOM lib, so the ambient `Crypto` type is unavailable here: a structural
 * type also lets tests inject `node:crypto`'s webcrypto without casts and lets
 * `{}` model a subtle-less environment (same pattern as batchedPoster's
 * PosterFetch).
 */
export interface PreviewSubtle {
  importKey(
    format: 'spki',
    keyData: PreviewBinary,
    algorithm: { name: string; namedCurve: string },
    extractable: boolean,
    keyUsages: string[],
  ): Promise<unknown>;
  verify(
    algorithm: { name: string; hash: string },
    key: unknown,
    signature: PreviewBinary,
    data: PreviewBinary,
  ): Promise<boolean>;
}

export interface PreviewCrypto {
  subtle?: PreviewSubtle;
}

/**
 * The two real callers of `verifyActivation` bind audience differently: the
 * web loader always has a page origin and checks `aud` against it, while a
 * container has no origin at all and is bound to one session instead. A
 * discriminated union (rather than an optional `origin`) turns "the caller
 * forgot `origin`" from a silent aud-check skip into a compile error on the
 * web arm; `expectSession` is forced on the container arm for the same
 * reason, since that arm's whole job is proving it checked *something*.
 */
type VerifyAudience =
  | { origin: string; expectSession?: undefined }
  | { origin?: undefined; expectSession: { ses: string; sb: string } };

export type VerifyParams = VerifyAudience & {
  /** Keys this host accepts. Current + previous, so rotation is non-disruptive. */
  keyring: PreviewKey[];
  /** Expected issuer, e.g. 'app:stage'. */
  iss: string;
  /** This host's baked project binding. Required unless `acceptForeign`. */
  pb?: string;
  /** Demo hosts only: skip the pb match, require aud to be a single allowlisted origin. */
  acceptForeign?: boolean;
  demoAllowlist?: string[];
  /** Which clock applies: the URL handover window, or the session expiry. */
  source: 'url' | 'storage';
  /** Epoch milliseconds. Injected so tests and the server control the clock. */
  now: number;
  /** Defaults to globalThis.crypto. Injectable for jsdom/node tests. */
  crypto?: PreviewCrypto;
};

/** A grant handed over in a URL is only accepted this long after `iat`. */
export const URL_WINDOW_MS = 15 * 60 * 1000;

/**
 * How far a grant's `iat` may sit in the future and still count as ordinary
 * clock skew rather than a broken or hostile mint clock (RFC 7519 §4.1.5
 * iat/nbf practice: reject a token issued in the future, with tolerance).
 */
export const CLOCK_SKEW_MS = 60 * 1000;

/**
 * Verifier-side ceiling on `sxp - iat`, independent of whatever the mint's
 * clock claims. The design spec's session TTL is a 60-minute ceiling
 * (`sxp = min(iat + 60 min, session remaining)`); this adds a modest margin
 * above that so a legitimate boundary-exact grant is never rejected by
 * rounding, while still bounding how long a leaked grant stays usable if a
 * mint clock is skewed or wrong.
 */
export const MAX_SESSION_MS = 65 * 60 * 1000;

function spkiToBytes(spki: string): Uint8Array | null {
  return decodeSegment(spki);
}

/**
 * Verify an activation grant locally: no network, no DB, the signature plus
 * the baked bindings carry the whole decision.
 *
 * Claim checks run before the signature check so a hostile or malformed
 * value costs almost nothing, but `ok: true` is only ever reached after the
 * ES256 verify succeeds: no unsigned claim value is trusted on its own, it
 * only ever decides which rejection reason comes back.
 */
export async function verifyActivation(
  raw: string,
  params: VerifyParams,
): Promise<VerifyResult> {
  const parsed = parseGrant(raw);
  if (!parsed) return { ok: false, reason: 'malformed' };
  const { grant, kid, signed, signature } = parsed;

  if (grant.iss !== params.iss) return { ok: false, reason: 'foreign-issuer' };
  // cap is already constrained to the 'activate' literal by parseGrant's
  // isGrant guard: kept as defense in depth in case that guard ever widens.
  if (grant.cap !== 'activate') return { ok: false, reason: 'cap-mismatch' };

  // A grant minted noticeably in the future means the mint's clock cannot be
  // trusted, and both clocks below are computed from iat: a skewed or buggy
  // mint clock would otherwise nullify them both. Tolerance, not zero,
  // because real clocks drift.
  if (grant.iat * 1000 > params.now + CLOCK_SKEW_MS) {
    return { ok: false, reason: 'expired' };
  }
  // The verifier's own bound on how long a grant may claim to live, so a
  // mint clock error can't stretch a session past what this host allows
  // regardless of what iat/sxp themselves say.
  if (grant.sxp * 1000 - grant.iat * 1000 > MAX_SESSION_MS) {
    return { ok: false, reason: 'expired' };
  }

  // URL grants respect BOTH clocks: the 15-minute handover window and the
  // session expiry (a re-mint near session end must not outlive the session).
  const deadline =
    params.source === 'url'
      ? Math.min(grant.iat * 1000 + URL_WINDOW_MS, grant.sxp * 1000)
      : grant.sxp * 1000;
  if (params.now >= deadline) return { ok: false, reason: 'expired' };

  // Exact membership only: no prefix/suffix/substring matching, so a lookalike
  // origin (an evil.com path containing the real origin, or a subdomain of it)
  // can never satisfy this.
  if (params.origin !== undefined && !grant.aud.includes(params.origin)) {
    return { ok: false, reason: 'aud-mismatch' };
  }
  if (params.acceptForeign) {
    // Demo grants are single-origin by contract: enforced verifier-side too,
    // and independent of whether an origin was supplied, so a container-side
    // caller (no `origin`) can't skip this gate.
    const allow = params.demoAllowlist ?? [];
    if (grant.aud.length !== 1 || !grant.aud.every((a) => allow.includes(a))) {
      return { ok: false, reason: 'aud-mismatch' };
    }
  }

  // pb binds a grant to the tenant whose bundle is running. Demo hosts opt out
  // (that is the whole point of the demo shop) and rely on the aud allowlist above.
  if (!params.acceptForeign) {
    if (!params.pb || grant.pb !== params.pb) {
      return { ok: false, reason: 'pb-mismatch' };
    }
  }

  // sb binds a grant to one session's container: without it, "valid signature"
  // would prove nothing about which tenant minted the grant, since one key
  // signs for the whole environment. Symmetric in both directions: a
  // session-scoped grant presented where no session is expected must not
  // silently pass either, or a grant minted for one session could activate at
  // a host that never asked to be bound to it.
  const grantIsSessionScoped =
    grant.ses !== undefined || grant.sb !== undefined;
  if (params.expectSession) {
    if (grant.ses !== params.expectSession.ses) {
      return { ok: false, reason: 'sb-mismatch' };
    }
    if (!grant.sb || grant.sb !== params.expectSession.sb) {
      return { ok: false, reason: 'sb-mismatch' };
    }
  } else if (grantIsSessionScoped) {
    return { ok: false, reason: 'sb-mismatch' };
  }

  const key = params.keyring.find((k) => k.kid === kid);
  if (!key) return { ok: false, reason: 'kid-mismatch' };

  // globalThis.crypto is untyped without the DOM lib: structural access is
  // the batchedPoster precedent (`globalThis.fetch as PosterFetch`).
  const cryptoImpl =
    params.crypto ?? (globalThis as { crypto?: PreviewCrypto }).crypto;
  const subtle = cryptoImpl?.subtle;
  if (!subtle) return { ok: false, reason: 'no-subtle' };

  const spki = spkiToBytes(key.spki);
  if (!spki) return { ok: false, reason: 'kid-mismatch' };

  try {
    const publicKey = await subtle.importKey(
      'spki',
      spki,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const valid = await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      signed,
    );
    if (!valid) return { ok: false, reason: 'bad-signature' };
  } catch {
    return { ok: false, reason: 'bad-signature' };
  }

  return { ok: true, grant };
}

export interface SwapActivatorConfig {
  keyring: PreviewKey[];
  iss: string;
  /** This bundle's project binding. Absent on demo hosts (see acceptForeign). */
  pb?: string;
  acceptForeign?: boolean;
  demoAllowlist?: string[];
  /** Bare CDN hostname, e.g. 'cdn.walkeros.io'. */
  previewOrigin: string;
  /** Injectable for tests. */
  now?: () => number;
  crypto?: PreviewCrypto;
}

const STORAGE_KEY = 'elbPreview';
const LOG = '[walkerOS:preview]';
const SWAP_TIMEOUT_MS = 5000;

// Structural slices of the browser globals the activator touches. Core
// compiles without the DOM lib, so window/document/URLSearchParams/console/
// setTimeout are all untyped here; reading them off globalThis behind guards
// is the batchedPoster precedent. Runtime behavior is identical.
interface ScriptEl {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  setAttribute(name: string, value: string): void;
  parentNode: { removeChild(el: ScriptEl): void } | null;
}

interface BrowserGlobals {
  window?: {
    location: { href: string; origin: string; search: string };
    history: { replaceState(data: unknown, title: string, url: string): void };
    localStorage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
    };
  };
  document?: {
    head: { appendChild(el: ScriptEl): void };
    createElement(tag: 'script'): ScriptEl;
  };
  URLSearchParams?: new (init: string) => {
    getAll(name: string): string[];
    delete(name: string): void;
    toString(): string;
  };
  console?: { warn(msg: string): void; info(msg: string): void };
  setTimeout?: (fn: () => void, ms: number) => number;
  clearTimeout?: (id: number) => void;
}

const G = globalThis as BrowserGlobals;

interface PreviewStore {
  get(): string | null;
  set(value: string): void;
  clear(): void;
}

/** localStorage, with an in-memory fallback for Safari private mode. */
function createStore(): PreviewStore {
  let memory: string | null = null;
  return {
    get() {
      try {
        return G.window?.localStorage.getItem(STORAGE_KEY) ?? memory;
      } catch {
        return memory;
      }
    },
    set(value) {
      try {
        G.window?.localStorage.setItem(STORAGE_KEY, value);
      } catch {
        memory = value;
      }
    },
    clear() {
      memory = null;
      try {
        G.window?.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // in-memory copy already cleared
      }
    },
  };
}

function stripParam(): void {
  const win = G.window;
  const USP = G.URLSearchParams;
  if (!win || !USP) return;
  try {
    const href = win.location.href;
    const hashIdx = href.indexOf('#');
    const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';
    const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    const qIdx = withoutHash.indexOf('?');
    const path = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
    const params = new USP(qIdx >= 0 ? withoutHash.slice(qIdx + 1) : '');
    params.delete('elbPreview');
    const query = params.toString();
    win.history.replaceState(
      {},
      '',
      `${path}${query ? `?${query}` : ''}${hash}`,
    );
  } catch {
    // A page that forbids history writes still previews; the param just stays.
  }
}

function injectArtifact(src: string, sri: string): Promise<boolean> {
  return new Promise((resolve) => {
    const doc = G.document;
    if (!doc) {
      resolve(false);
      return;
    }
    const script = doc.createElement('script');
    let settled = false;
    let timer: number | undefined;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) G.clearTimeout?.(timer);
      if (!ok && script.parentNode) script.parentNode.removeChild(script);
      resolve(ok);
    };
    timer = G.setTimeout?.(() => done(false), SWAP_TIMEOUT_MS);
    script.onload = () => done(true);
    script.onerror = () => done(false);
    script.setAttribute('integrity', sri);
    script.setAttribute('crossorigin', 'anonymous');
    script.src = src;
    doc.head.appendChild(script);
  });
}

/**
 * Decide whether a preview bundle should boot in place of this bundle's own flow.
 *
 * Returns true iff a preview took over, in which case the caller must not boot
 * the production flow. Every failure path deterministically returns false: the
 * loader never throws, never retries, and never leaves a page without a walker.
 *
 * Anti-griefing invariant: a rejected URL grant never touches stored state,
 * the activator falls back to the stored grant instead. Only a failing stored
 * grant clears storage (self-heal), plus `off` and `swap-failed`.
 */
export async function browserSwapActivator(
  cfg: SwapActivatorConfig,
): Promise<boolean> {
  const win = G.window;
  if (!win || !G.document) return false;

  const store = createStore();
  const now = cfg.now ?? (() => Date.now());
  const warn = (reason: string) => G.console?.warn(`${LOG} ${reason}`);

  let param: string | null = null;
  const USP = G.URLSearchParams;
  if (USP) {
    try {
      const values = new USP(win.location.search.replace(/^\?/, '')).getAll(
        'elbPreview',
      );
      param = values.length > 0 ? (values[values.length - 1] ?? null) : null;
    } catch {
      param = null;
    }
  }

  if (param === 'off') {
    store.clear();
    stripParam();
    return false;
  }

  const stored = store.get();

  // Zero-work fast path: the overwhelmingly common case on a production page.
  // No crypto, no storage writes, no DOM work.
  if (!param && !stored) return false;

  const verify = (raw: string, source: 'url' | 'storage') =>
    verifyActivation(raw, {
      keyring: cfg.keyring,
      iss: cfg.iss,
      origin: win.location.origin,
      pb: cfg.pb,
      acceptForeign: cfg.acceptForeign,
      demoAllowlist: cfg.demoAllowlist,
      source,
      now: now(),
      crypto: cfg.crypto,
    });

  let grant: ActivationGrant | null = null;

  // 1) URL grant first. Rejection for any reason (malformed, unsigned, bad
  //    signature, expired, wrong aud) is warned and ignored, and must never
  //    clear stored state: verification runs cheap checks before crypto, so
  //    at rejection time we cannot know whether the value was even one of
  //    ours, and a crafted link must not end someone's active session.
  if (param) {
    const result = await verify(param, 'url');
    if (result.ok) {
      grant = result.grant;
      store.set(param);
    } else {
      warn(result.reason);
    }
    stripParam();
  }

  // 2) Fall back to the stored grant. This one clears on failure: it came
  //    from our own storage, so clearing is self-healing, not griefable.
  //    (Except `no-subtle`: that is the environment's fault, not the grant's.)
  if (!grant && stored) {
    const result = await verify(stored, 'storage');
    if (result.ok) {
      grant = result.grant;
    } else {
      warn(result.reason);
      if (result.reason !== 'no-subtle') store.clear();
    }
  }

  if (!grant) return false;

  const src = `https://${cfg.previewOrigin}/preview/${grant.art}.js`;
  const loaded = await injectArtifact(src, grant.sri);

  if (!loaded) {
    warn('swap-failed');
    store.clear();
    return false;
  }

  G.console?.info(
    `${LOG} active ${grant.art} ends ${new Date(grant.sxp * 1000).toISOString()}`,
  );
  return true;
}
