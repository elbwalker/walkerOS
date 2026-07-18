/**
 * Unified observation connect protocol: the public shapes and pure parsers a
 * customer-side runtime uses to attach to an observation session. Everything a
 * customer commits is public (`url`, `binding`); the per-session credential
 * arrives out-of-band and is only parsed here, never verified: the observer
 * is its verifier. No DOM, no Node, pure string/object functions.
 */

/** Web arm connect config. Every value is public and safe to commit. */
export interface ObserveWeb {
  url: string;
  binding: string;
  /**
   * FlowState scoping id stamped onto every posted record. Defaults to the
   * collector's flow name; bakers (e.g. a preview artifact) set it so records
   * carry the platform's flow id rather than the config's local name.
   */
  flowId?: string;
  /**
   * Observer verbosity once a credential attaches. Defaults to 'standard'.
   * Also drives the collector-wide capture level supplier, so 'trace'
   * enables destination call capture.
   */
  level?: 'off' | 'standard' | 'trace';
  /** Deterministic sample fraction in [0, 1]. Defaults to 1. */
  sample?: number;
}

/** Server arm connect config, assembled from the deployment's env trio. */
export interface ObserveServer {
  url: string;
  sessionId: string;
  token: string;
  level?: 'off' | 'standard' | 'trace';
  /** Deterministic sample fraction in [0, 1]. Defaults to 1. */
  sample?: number;
}

export type Observe = ObserveWeb | ObserveServer;

/** Claims carried by a parsed `obsw_` web credential. */
export interface ObserveCredential {
  /** Project binding. Must match the value baked into the host bundle. */
  pb: string;
  /** Session id the credential attaches to. */
  ses: string;
  /** Web ingest token. Opaque here; the observer verifies it. */
  secret: string;
}

const CREDENTIAL_PREFIX = 'obsw_';

/**
 * Parse a web observation credential of the exact shape
 * `obsw_<pb>.<ses>.<secret>`: the `obsw_` prefix followed by exactly three
 * non-empty dot-separated segments. Returns null (never throws) on every
 * malformed shape: wrong prefix, wrong segment count, empty segment.
 */
export function parseObserveCredential(raw: string): ObserveCredential | null {
  if (!raw.startsWith(CREDENTIAL_PREFIX)) return null;
  const segments = raw.slice(CREDENTIAL_PREFIX.length).split('.');
  const [pb, ses, secret] = segments;
  if (segments.length !== 3 || !pb || !ses || !secret) return null;
  return { pb, ses, secret };
}

function isLevel(value: string): value is 'off' | 'standard' | 'trace' {
  return value === 'off' || value === 'standard' || value === 'trace';
}

/**
 * Read the server arm's connect config from an env record. Callers pass their
 * own env (e.g. `process.env`); core never reads globals. Returns an
 * `ObserveServer` only when the full trio (`WALKEROS_OBSERVER_URL`,
 * `WALKEROS_DEPLOYMENT_ID`, `WALKEROS_INGEST_TOKEN`) is present, carrying
 * `WALKEROS_OBSERVE_LEVEL` into `level`. An explicitly set level that names
 * no known value (e.g. a typo'd `offf`) rejects the whole config: silently
 * observing at the default `standard` against a probable opt-out intent is
 * the one failure mode this parser must never produce. Otherwise undefined:
 * an unconfigured deployment does zero observation work.
 */
export function observeFromEnv(
  env: Record<string, string | undefined>,
): ObserveServer | undefined {
  const url = env.WALKEROS_OBSERVER_URL;
  const sessionId = env.WALKEROS_DEPLOYMENT_ID;
  const token = env.WALKEROS_INGEST_TOKEN;
  if (!url || !sessionId || !token) return undefined;
  const server: ObserveServer = { url, sessionId, token };
  const level = env.WALKEROS_OBSERVE_LEVEL;
  if (level !== undefined) {
    if (!isLevel(level)) return undefined;
    server.level = level;
  }
  return server;
}
