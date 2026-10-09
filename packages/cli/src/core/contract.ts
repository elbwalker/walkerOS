import { createHash } from 'node:crypto';
import semver from 'semver';
import { resolveAppUrl } from '../lib/config-file.js';
import { VERSION } from '../version.js';
import { apiRequest, operationUrl } from './api-request.js';
import { getClientContext, type ClientContext } from './client-context.js';
import { canonicalize, operationDigests } from './openapi-subset.js';

/**
 * One app operation this client calls: `"<METHOD> <path>"`, the commands and
 * tools that call it (from `openapi/client-operations.json`) and the wire
 * digest of its shape in the client's `openapi/spec.json`.
 */
export interface ClientOperation {
  op: string;
  usedBy: string[];
  digest: string;
}

// Build-time defines, injected by tsup (see tsup.config.ts). In source/test
// (un-bundled) contexts these are absent, so the runtime falls back to a
// placeholder via `typeof` guards in the exported constants below.
declare const __CONTRACT_VERSION__: string;
declare const __CONTRACT_HASH__: string;
declare const __CLIENT_OPERATION_DIGESTS__: readonly ClientOperation[];

const PLACEHOLDER = '0.0.0-unbundled';

/**
 * The contract label this client was built against (`<floor>+<hash8>`),
 * baked from the bundled `openapi/spec.json` `info.version` at build time.
 */
export const bakedContractVersion: string =
  typeof __CONTRACT_VERSION__ === 'string' ? __CONTRACT_VERSION__ : PLACEHOLDER;

/**
 * Canonical content hash of the bundled client subset (`openapi/spec.json`),
 * baked at build time with {@link canonicalContractHash}.
 */
export const bakedContractHash: string =
  typeof __CONTRACT_HASH__ === 'string' ? __CONTRACT_HASH__ : '';

/**
 * Every app operation this client calls, with its usedBy and the wire digest
 * of the bundled `openapi/spec.json`, baked at build time.
 */
export const bakedClientOperations: readonly ClientOperation[] =
  typeof __CLIENT_OPERATION_DIGESTS__ === 'object'
    ? __CLIENT_OPERATION_DIGESTS__
    : [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Strip `info.version` so a version-only bump does not change the content hash.
 * Mirrors the app's `stripInfoVersion`.
 */
function stripInfoVersion(doc: unknown): unknown {
  if (!isRecord(doc) || !isRecord(doc.info)) {
    return doc;
  }
  const restInfo: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc.info)) {
    if (key !== 'version') restInfo[key] = value;
  }
  return { ...doc, info: restInfo };
}

/**
 * Deterministic sha256 hex of an OpenAPI document's content.
 *
 * Parity contract: identical to the app's `computeContractHash`
 * (app/src/lib/api/contract-version.ts): sha256 of
 * `JSON.stringify(canonicalize(stripInfoVersion(doc)))`, so the same document
 * hashes the same on both sides.
 */
export function canonicalContractHash(doc: unknown): string {
  const canonical = canonicalize(stripInfoVersion(doc));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export interface HealthResult {
  reachable: boolean;
  status?: string;
  appVersion?: string;
  contractVersion?: string;
  contractHash?: string;
  /** The lowest client version the server accepts. */
  minSupportedClient?: string;
  /** The HTTP status, when the app answered with a non-2xx one. */
  httpStatus?: number;
  /** Why the probe failed, when it did not reach the app. */
  error?: string;
}

const HEALTH_TIMEOUT_MS = 5000;
const OPENAPI_TIMEOUT_MS = 10000;

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Why a request did not reach the app: `timeout after <ms> ms`, or the
 * network error with its code, such as `fetch failed (ECONNREFUSED)`.
 */
function failureReason(error: unknown, timeoutMs: number): string {
  // Read by shape, not `instanceof`: an abort's DOMException can come from
  // another realm.
  if (!isRecord(error)) return String(error);
  if (error.name === 'TimeoutError') return `timeout after ${timeoutMs} ms`;
  const message =
    typeof error.message === 'string' ? error.message : String(error);
  const cause = error.cause;
  const code =
    isRecord(cause) && typeof cause.code === 'string' ? cause.code : undefined;
  return code ? `${message} (${code})` : message;
}

/**
 * Tokenless reachability + contract probe of the app's PUBLIC health route
 * (`GET /api/health`). Sends no credential (never `createApiClient`, whose
 * every request rejects without one) and defensively parses the JSON body.
 * Resolves `{ reachable: false, error }` only on a real network/timeout
 * failure; a non-2xx status still counts as reachable.
 *
 * `baseUrl` names the app to probe, without a trailing slash. Omitted, it
 * falls back to `resolveAppUrl()`, the local machine's chain
 * (`WALKEROS_APP_URL`, then the CLI config file, then the built-in default),
 * which is what every `walkeros` binary invocation wants. A caller that is
 * NOT the local CLI has to pass its own: an in-process host has no CLI config
 * to read, so the fallback would silently probe a different backend than the
 * one that caller talks to.
 */
export async function fetchHealth(baseUrl?: string): Promise<HealthResult> {
  try {
    const res = await apiRequest('GET /api/health', {
      auth: 'none',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      ...(baseUrl === undefined ? {} : { baseUrl }),
    });
    const body: unknown = await res.json().catch(() => undefined);
    const result: HealthResult = { reachable: true };
    if (!res.ok) result.httpStatus = res.status;
    if (isRecord(body)) {
      if (typeof body.status === 'string') result.status = body.status;
      if (typeof body.appVersion === 'string')
        result.appVersion = body.appVersion;
      if (typeof body.contractVersion === 'string')
        result.contractVersion = body.contractVersion;
      if (typeof body.contractHash === 'string')
        result.contractHash = body.contractHash;
      if (typeof body.minSupportedClient === 'string')
        result.minSupportedClient = body.minSupportedClient;
    }
    return result;
  } catch (error) {
    return {
      reachable: false,
      error: failureReason(error, HEALTH_TIMEOUT_MS),
    };
  }
}

/** The live OpenAPI document of an app, or why it could not be read. */
export type OpenApiResult =
  | { ok: true; url: string; document: { [key: string]: unknown } }
  | { ok: false; url: string; error: string };

/**
 * The app's PUBLIC OpenAPI document (`GET /api/openapi.json`), without a
 * credential. `error` is `HTTP <status>`, `response is not JSON`, `no paths`,
 * a timeout or the network error. `baseUrl` defaults like
 * {@link fetchHealth}.
 */
export async function fetchOpenApi(baseUrl?: string): Promise<OpenApiResult> {
  const base = baseUrl ?? trimTrailingSlashes(resolveAppUrl());
  const url = operationUrl('GET /api/openapi.json', { baseUrl: base });
  let res: Response;
  try {
    res = await apiRequest('GET /api/openapi.json', {
      auth: 'none',
      baseUrl: base,
      signal: AbortSignal.timeout(OPENAPI_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, url, error: failureReason(error, OPENAPI_TIMEOUT_MS) };
  }
  if (!res.ok) return { ok: false, url, error: `HTTP ${res.status}` };
  const document: unknown = await res.json().catch(() => undefined);
  if (!isRecord(document)) {
    return { ok: false, url, error: 'response is not JSON' };
  }
  if (!isRecord(document.paths)) return { ok: false, url, error: 'no paths' };
  return { ok: true, url, document };
}

/**
 * The verdict on this client against the live app, per operation:
 * - `in-sync`: every client operation has the client's wire shape.
 * - `changed`: some client operations differ from the server's and the
 *   server's label names a floor (`<floor>+<hash8>`) not below the client's.
 *   When the server's floor is higher, the server is the newer deploy:
 *   upgrade the client. With the same floor a hash has no order, so the
 *   server may be a newer or an older deploy.
 * - `server-older`: the server lacks client operations, or changed some and
 *   its label names a lower floor or none (a label without build metadata
 *   predates floors).
 * - `client-outdated`: the server's `minSupportedClient` is above this
 *   client's version.
 * - `unknown`: the health route or the OpenAPI document could not be read, or
 *   the client has no operations to compare.
 * - `in-process`: a door served inside the app it reports; never computed by
 *   {@link compareContract}.
 */
export type ContractVerdict =
  | 'in-sync'
  | 'changed'
  | 'server-older'
  | 'client-outdated'
  | 'unknown'
  | 'in-process';

/** The client a verdict is about. */
export interface ContractClient {
  /** `@walkeros/cli`, `@walkeros/mcp` or `@walkeros/runner`. */
  package: string;
  version: string;
  /** The contract label the client was built against. */
  contract: string;
}

/** A client operation the server does not offer, with its callers. */
export interface MissingOperation {
  op: string;
  usedBy: string[];
}

export interface ContractComparison {
  verdict: ContractVerdict;
  /** The app compared against, without a trailing slash. */
  appUrl: string;
  client: ContractClient;
  /** The server's contract label, when it names one. */
  server?: string;
  /** The lowest client version the server accepts, when it names one. */
  minSupportedClient?: string;
  /** How many client operations were compared. */
  operations?: number;
  missing?: MissingOperation[];
  /** Client operations whose wire shape differs from the client's. */
  changed?: string[];
  /** `client-outdated`: the package and the lowest version the server accepts. */
  requires?: { package: string; version: string };
  /** `unknown`: what could not be read. */
  reason?: string;
}

export interface CompareContractInput {
  /**
   * The app to compare against, without a trailing slash. Omitted, the local
   * machine's app URL; see {@link fetchHealth}.
   */
  baseUrl?: string;
  /** The client asking. Default: the process client context, else this CLI. */
  client?: ClientContext;
  /** The client's contract label. Default {@link bakedContractVersion}. */
  bakedVersion?: string;
  /** The client's operations. Default {@link bakedClientOperations}. */
  operations?: readonly ClientOperation[];
}

function isBelow(version: string, floor: string): boolean {
  return (
    semver.valid(version) !== null &&
    semver.valid(floor) !== null &&
    semver.lt(version, floor)
  );
}

/**
 * Whether a server label orders below the client's. Only a `<floor>+<hash8>`
 * label names a floor; a label without build metadata, or none at all, comes
 * from a server older than floors, so it counts as below.
 */
function serverFloorBelow(server: string | undefined, client: string): boolean {
  if (server === undefined || !server.includes('+')) return true;
  if (semver.valid(server) === null) return true;
  return isBelow(server, client);
}

function documentLabel(document: {
  [key: string]: unknown;
}): string | undefined {
  const info = document.info;
  return isRecord(info) && typeof info.version === 'string'
    ? info.version
    : undefined;
}

/**
 * Compare this client with the live app, operation by operation. First match
 * wins:
 * 1. the health route fails: `unknown`;
 * 2. health names a `minSupportedClient` above the client's version:
 *    `client-outdated`;
 * 3. the client has no operations, or the OpenAPI document fails or has no
 *    paths: `unknown`;
 * 4. the live document, pruned to the client's operations, gives `missing`
 *    (operations it lacks) and `changed` (digests that differ);
 * 5. `missing` not empty: `server-older`;
 * 6. `changed` not empty: `server-older` when the server label names a floor
 *    below the client's or no floor at all, else `changed`;
 * 7. `in-sync`. Operations no client calls and the stripped documentation
 *    keywords never count.
 *
 * Sends no credential. Never throws.
 */
export async function compareContract(
  input: CompareContractInput = {},
): Promise<ContractComparison> {
  const appUrl = trimTrailingSlashes(input.baseUrl ?? resolveAppUrl());
  const context = input.client ??
    getClientContext() ?? { type: 'cli', version: VERSION };
  const client: ContractClient = {
    package: `@walkeros/${context.type}`,
    version: context.version,
    contract: input.bakedVersion ?? bakedContractVersion,
  };
  const operations = input.operations ?? bakedClientOperations;

  const health = await fetchHealth(appUrl);
  if (!health.reachable) {
    const url = operationUrl('GET /api/health', { baseUrl: appUrl });
    return {
      verdict: 'unknown',
      appUrl,
      client,
      reason: `GET ${url}: ${health.error ?? 'no response'}`,
    };
  }
  const known: ContractComparison = {
    verdict: 'unknown',
    appUrl,
    client,
    ...(health.contractVersion !== undefined && {
      server: health.contractVersion,
    }),
    ...(health.minSupportedClient !== undefined && {
      minSupportedClient: health.minSupportedClient,
    }),
  };
  if (
    health.minSupportedClient !== undefined &&
    isBelow(client.version, health.minSupportedClient)
  ) {
    return {
      ...known,
      verdict: 'client-outdated',
      requires: { package: client.package, version: health.minSupportedClient },
    };
  }

  if (operations.length === 0) {
    return { ...known, reason: 'no baked client operations' };
  }

  const live = await fetchOpenApi(appUrl);
  if (!live.ok) {
    return { ...known, reason: `GET ${live.url}: ${live.error}` };
  }
  let liveDigests: Record<string, string>;
  try {
    liveDigests = operationDigests(
      live.document,
      operations.map(({ op }) => op),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ...known, reason: `GET ${live.url}: ${message}` };
  }

  const missing: MissingOperation[] = operations
    .filter(({ op }) => !Object.hasOwn(liveDigests, op))
    .map(({ op, usedBy }) => ({ op, usedBy }));
  const changed = operations
    .filter(({ op, digest }) => {
      return Object.hasOwn(liveDigests, op) && liveDigests[op] !== digest;
    })
    .map(({ op }) => op);
  const server = known.server ?? documentLabel(live.document);
  const compared: ContractComparison = {
    ...known,
    ...(server !== undefined && { server }),
    operations: operations.length,
    missing,
    changed,
  };

  if (missing.length > 0) return { ...compared, verdict: 'server-older' };
  if (changed.length > 0) {
    const older = serverFloorBelow(server, client.contract);
    return { ...compared, verdict: older ? 'server-older' : 'changed' };
  }
  return { ...compared, verdict: 'in-sync' };
}

/** `op (caller, caller)` for each missing operation. */
function missingList(missing: readonly MissingOperation[]): string {
  return missing
    .map(({ op, usedBy }) =>
      usedBy.length > 0 ? `${op} (${usedBy.join(', ')})` : op,
    )
    .join(', ');
}

/**
 * One line stating a {@link ContractComparison}, for a terminal or a log:
 * `contract: <verdict> (<facts>)`, plus what differs.
 */
export function formatContract(c: ContractComparison): string {
  const server = c.server ?? 'without a label';
  const labels = `server ${server}, client ${c.client.contract}`;
  const missing = c.missing ?? [];
  const changed = c.changed ?? [];
  switch (c.verdict) {
    case 'in-sync':
      return `contract: in-sync (${labels}, ${c.operations ?? 0} operations)`;
    case 'changed':
      return `contract: changed (${labels}); changed: ${changed.join(', ')}`;
    case 'server-older': {
      const parts = [`contract: server-older (${labels})`];
      if (missing.length > 0) {
        parts.push(`not offered (${missing.length}): ${missingList(missing)}`);
      }
      if (changed.length > 0) parts.push(`changed: ${changed.length}`);
      return parts.join('; ');
    }
    case 'client-outdated': {
      const pkg = c.requires?.package ?? c.client.package;
      const floor = c.requires?.version ?? c.minSupportedClient;
      const requires =
        floor === undefined ? '' : ` requires ${pkg} >= ${floor}`;
      return `contract: client-outdated (${c.appUrl}${requires}; this is ${c.client.version})`;
    }
    case 'unknown':
      return `contract: unknown (${c.reason ?? 'no reason given'})`;
    case 'in-process':
      return `contract: in-process (server ${server})`;
  }
}
