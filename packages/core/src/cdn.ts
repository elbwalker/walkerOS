import type { Flow } from './types';
import { isStringRecord, parsePackageMeta } from './packageMeta';

const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/npm';
const DEFAULT_SCHEMA_PATH = 'dist/walkerOS.json';

export interface ExampleSummary {
  name: string;
  description?: string;
}

export interface WalkerOSPackageMeta extends Pick<
  Flow.PackageMeta,
  'version' | 'type'
> {
  packageName: string;
  description?: string;
  platform?: string | string[];
}

export interface WalkerOSPackageInfo {
  packageName: string;
  version: string;
  type?: string;
  platform?: string | string[];
  schemas: Record<string, unknown>;
  examples: Record<string, unknown>;
  hints?: Record<string, unknown>;
}

export interface WalkerOSPackage extends WalkerOSPackageInfo {
  description?: string;
  docs?: string;
  source?: string;
  hintKeys: string[];
  exampleSummaries: ExampleSummary[];
  /**
   * Examples per export, keyed by export name. Present only for packages
   * that ship several exports; `examples` then holds the default export's.
   */
  exportExamples?: Record<string, unknown>;
  /**
   * Schemas per export, keyed by export name, each entry shaped like
   * `schemas` of a single-export package (`settings`, `mapping`, `setup`).
   * Present only for packages that ship several exports.
   */
  exportSchemas?: Record<string, Record<string, unknown>>;
  /** Declared exports (name to description) from `$meta.exports`. */
  exports?: Record<string, string>;
}

/**
 * Local mirror of the app's `PackageDetailResult` shape for `expand=all`
 * responses. Decoupled from the app intentionally — `core` does not import
 * from `app`. Only the fields read by `shapeFromDetail` are typed.
 */
interface UnifiedPackageResponse {
  package: string;
  version: string;
  description?: string;
  type?: string;
  platform?: string[];
  docs?: string;
  source?: string;
  schemas?: Record<string, unknown>;
  hints?: Record<string, unknown>;
  hintKeys?: string[];
  exampleSummaries?: ExampleSummary[];
  examples?: Record<string, unknown>;
  exportExamples?: Record<string, unknown>;
  exportSchemas?: Record<string, unknown>;
  exports?: Record<string, unknown>;
}

export async function fetchPackage(
  packageName: string,
  options?: {
    version?: string;
    timeout?: number;
    baseUrl?: string;
    client?: string;
  },
): Promise<WalkerOSPackage> {
  const ver = options?.version || 'latest';
  const timeoutMs = options?.timeout || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = controller.signal;
  const headers = options?.client
    ? { 'X-Walkeros-Client': options.client }
    : undefined;

  try {
    if (options?.baseUrl) {
      // Single round-trip via the unified detail endpoint
      // (`expand=all` returns hints + examples in one shot).
      const url = `${options.baseUrl}/api/packages/${encodeURIComponent(packageName)}?version=${encodeURIComponent(ver)}&expand=all`;
      const res = await fetch(url, { signal, ...(headers && { headers }) });
      if (!res.ok)
        throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
      const detail = (await res.json()) as UnifiedPackageResponse;
      return shapeFromDetail(packageName, ver, detail);
    }

    // Direct jsdelivr fallback (offline-safe path) — keep two-fetch.
    const base = `${JSDELIVR_BASE}/${packageName}@${ver}`;
    const pkg = await fetchJson(`${base}/package.json`, signal, headers);
    const walkerOSJson = await fetchJson(
      `${base}/${DEFAULT_SCHEMA_PATH}`,
      signal,
      headers,
    );
    return parsePackage(packageName, ver, pkg, walkerOSJson);
  } finally {
    clearTimeout(timer);
  }
}

function shapeFromDetail(
  packageName: string,
  ver: string,
  detail: UnifiedPackageResponse,
): WalkerOSPackage {
  const schemas = (detail.schemas as Record<string, unknown> | undefined) || {};
  const examples =
    (detail.examples as Record<string, unknown> | undefined) || {};
  const hints = detail.hints;
  const hintKeys = detail.hintKeys ?? (hints ? Object.keys(hints) : []);
  const exampleSummaries = detail.exampleSummaries ?? [];
  const platform = detail.platform;
  const exportExamples = detail.exportExamples;
  const exportSchemas = detail.exportSchemas;
  const exports = detail.exports;

  return {
    packageName: detail.package || packageName,
    version: typeof detail.version === 'string' ? detail.version : ver,
    ...(detail.description !== undefined && {
      description: detail.description,
    }),
    ...(detail.type !== undefined && { type: detail.type }),
    ...(platform !== undefined && { platform }),
    schemas,
    examples,
    ...(detail.docs !== undefined && { docs: detail.docs }),
    ...(detail.source !== undefined && { source: detail.source }),
    ...(hints && Object.keys(hints).length > 0 ? { hints } : {}),
    hintKeys,
    exampleSummaries,
    ...(isObjectRecord(exportExamples) ? { exportExamples } : {}),
    ...(isRecordOfRecords(exportSchemas) ? { exportSchemas } : {}),
    ...(isStringRecord(exports) ? { exports } : {}),
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRecordOfRecords(
  value: unknown,
): value is Record<string, Record<string, unknown>> {
  return isObjectRecord(value) && Object.values(value).every(isObjectRecord);
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
  headers?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, { signal, ...(headers && { headers }) });
  if (!res.ok) throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/**
 * The walkerOS metadata of a package, parsed from its walkerOS.json the same
 * way for every source: a CDN release or a local package on disk.
 */
export function parseWalkerOSJson(
  walkerOSJson: Record<string, unknown>,
): Omit<WalkerOSPackage, 'packageName' | 'version' | 'description'> {
  const meta = parsePackageMeta(walkerOSJson.$meta);
  const schemas = (walkerOSJson.schemas as Record<string, unknown>) || {};
  const examples = (walkerOSJson.examples as Record<string, unknown>) || {};
  const hints = walkerOSJson.hints as Record<string, unknown> | undefined;
  const hintKeys = hints ? Object.keys(hints) : [];
  const exportExamples = walkerOSJson.exportExamples;
  const exportSchemas = walkerOSJson.exportSchemas;
  const { docs, source, exports } = meta;

  const exampleSummaries: ExampleSummary[] = [];
  const stepExamples = (examples.step || {}) as Record<string, unknown>;
  for (const [name, example] of Object.entries(stepExamples)) {
    const ex = example as Record<string, unknown> | undefined;
    const summary: ExampleSummary = { name };
    if (typeof ex?.description === 'string')
      summary.description = ex.description;
    exampleSummaries.push(summary);
  }

  return {
    type: meta.type,
    platform: meta.platform,
    schemas,
    examples,
    ...(docs ? { docs } : {}),
    ...(source ? { source } : {}),
    ...(hints && Object.keys(hints).length > 0 ? { hints } : {}),
    hintKeys,
    exampleSummaries,
    ...(isObjectRecord(exportExamples) ? { exportExamples } : {}),
    ...(isRecordOfRecords(exportSchemas) ? { exportSchemas } : {}),
    ...(exports ? { exports } : {}),
  };
}

function parsePackage(
  packageName: string,
  ver: string,
  pkg: Record<string, unknown>,
  walkerOSJson: Record<string, unknown>,
): WalkerOSPackage {
  return {
    packageName,
    version: typeof pkg.version === 'string' ? pkg.version : ver,
    description:
      typeof pkg.description === 'string' ? pkg.description : undefined,
    ...parseWalkerOSJson(walkerOSJson),
  };
}

/**
 * @deprecated Use fetchPackage instead.
 * Still used by: entry.ts (validator), package-schemas.ts (MCP resource).
 */
export async function fetchPackageSchema(
  packageName: string,
  options?: {
    version?: string;
    timeout?: number;
    baseUrl?: string;
    client?: string;
  },
): Promise<WalkerOSPackageInfo> {
  const pkg = await fetchPackage(packageName, options);
  return {
    packageName: pkg.packageName,
    version: pkg.version,
    type: pkg.type,
    platform: pkg.platform,
    schemas: pkg.schemas,
    examples: pkg.examples,
    ...(pkg.hints ? { hints: pkg.hints } : {}),
  };
}
