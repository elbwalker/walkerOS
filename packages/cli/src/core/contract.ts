import { createHash } from 'node:crypto';
import semver from 'semver';
import { resolveAppUrl } from '../lib/config-file.js';

// Build-time defines, injected by tsup (see tsup.config.ts). In source/test
// (un-bundled) contexts these are absent, so the runtime falls back to a
// placeholder via `typeof` guards in the exported constants below.
declare const __CONTRACT_VERSION__: string;
declare const __CONTRACT_HASH__: string;

const PLACEHOLDER = '0.0.0-unbundled';

/**
 * Semver of the API contract this client was built against, baked from the
 * bundled `openapi/spec.json` `info.version` at build time.
 */
export const bakedContractVersion: string =
  typeof __CONTRACT_VERSION__ === 'string' ? __CONTRACT_VERSION__ : PLACEHOLDER;

/**
 * Canonical content hash of the bundled OpenAPI contract, baked at build time.
 * Computed with {@link canonicalContractHash} so it is byte-for-byte comparable
 * to the app's live `contractHash`.
 */
export const bakedContractHash: string =
  typeof __CONTRACT_HASH__ === 'string' ? __CONTRACT_HASH__ : '';

/**
 * Recursively canonicalize a JSON-like value so semantically equal documents
 * produce byte-identical output regardless of key order. Arrays keep order.
 *
 * MUST stay byte-for-byte identical to the app's `canonicalize`
 * (app/src/lib/api/contract-version.ts) so client and server agree on hashes.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalize(value[key]);
    }
    return result;
  }
  return value;
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
 * `JSON.stringify(canonicalize(stripInfoVersion(doc)))`. Drift detection only
 * works while this stays in lockstep with the app helper.
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
}

const HEALTH_TIMEOUT_MS = 5000;

/**
 * Tokenless reachability + contract probe of the app's PUBLIC `/api/health`
 * route. Uses a plain `fetch` (never `createApiClient`, which throws logged
 * out) and defensively parses the JSON body. Resolves `{ reachable: false }`
 * only on a real network/timeout failure; a non-2xx status still counts as
 * reachable.
 */
export async function fetchHealth(): Promise<HealthResult> {
  try {
    const res = await fetch(`${resolveAppUrl()}/api/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    const body: unknown = await res.json().catch(() => undefined);
    const result: HealthResult = { reachable: true };
    if (isRecord(body)) {
      const record = body;
      if (typeof record.status === 'string') result.status = record.status;
      if (typeof record.appVersion === 'string')
        result.appVersion = record.appVersion;
      if (typeof record.contractVersion === 'string')
        result.contractVersion = record.contractVersion;
      if (typeof record.contractHash === 'string')
        result.contractHash = record.contractHash;
    }
    return result;
  } catch {
    return { reachable: false };
  }
}

export type ContractVerdict =
  | 'in-sync'
  | 'client-older'
  | 'client-newer'
  | 'unknown';

export interface ContractComparison {
  verdict: ContractVerdict;
  bakedVersion: string;
  liveVersion?: string;
  action?: string;
}

export interface CompareContractInput {
  bakedVersion?: string;
  bakedHash?: string;
}

/**
 * Compare the client's baked contract against the live app's `/api/health`.
 *
 * - unreachable / missing `contractVersion`+`contractHash` → `unknown`
 * - baked hash == live hash → `in-sync`
 * - hashes differ → semver-compare versions:
 *     live > baked → `client-older` (with an upgrade `action`)
 *     otherwise    → `client-newer`
 */
export async function compareContract(
  input: CompareContractInput = {},
): Promise<ContractComparison> {
  const bakedVersion = input.bakedVersion ?? bakedContractVersion;
  const bakedHash = input.bakedHash ?? bakedContractHash;

  const health = await fetchHealth();
  if (
    !health.reachable ||
    health.contractVersion === undefined ||
    health.contractHash === undefined
  ) {
    return { verdict: 'unknown', bakedVersion };
  }

  const liveVersion = health.contractVersion;
  if (health.contractHash === bakedHash) {
    return { verdict: 'in-sync', bakedVersion, liveVersion };
  }

  const liveNewer =
    semver.valid(liveVersion) && semver.valid(bakedVersion)
      ? semver.gt(liveVersion, bakedVersion)
      : liveVersion > bakedVersion;

  if (liveNewer) {
    return {
      verdict: 'client-older',
      bakedVersion,
      liveVersion,
      action: `upgrade @walkeros/cli to >= ${liveVersion}`,
    };
  }
  return { verdict: 'client-newer', bakedVersion, liveVersion };
}

/**
 * Turn an opaque failure into an actionable one by appending the contract-drift
 * verdict. Use on the error/unexpected-shape path: when a request fails in a way
 * the client cannot parse, a `client-older` verdict explains why ("you may be
 * behind the server"). Returns the original error untouched when in-sync or when
 * drift can't be determined (unknown / unreachable), so a network blip never
 * masks the real error.
 */
export async function annotateErrorWithDrift(
  error: Error,
  input: CompareContractInput = {},
): Promise<Error> {
  const comparison = await compareContract(input).catch(
    (): ContractComparison => ({
      verdict: 'unknown',
      bakedVersion: input.bakedVersion ?? bakedContractVersion,
    }),
  );
  if (comparison.verdict !== 'client-older' || !comparison.action) {
    return error;
  }
  const annotated = new Error(
    `${error.message}\n\nThe server runs contract ${comparison.liveVersion}, ` +
      `this client was built against ${comparison.bakedVersion}. ` +
      `This may be the cause: ${comparison.action}.`,
  );
  annotated.stack = error.stack;
  return annotated;
}
