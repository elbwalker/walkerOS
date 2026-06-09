// __VERSION__ is replaced at build time by tsup's `define` (see tsup.config.ts).
// In tests, it's set on globalThis (see src/__tests__/support/version.ts).
declare const __VERSION__: string;

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/npm';
const WALKEROS_JSON_PATH = 'dist/walkerOS.json';
const CACHE_TTL = 5 * 60 * 1000;

export const CLIENT_HEADER = 'walkeros-mcp/' + __VERSION__;

/**
 * Resolve the walkerOS app base URL for MCP outbound calls.
 *
 * Env-only by design: the MCP runs in an editor with explicit `.mcp.json`
 * env. No config-file precedence (which is what `@walkeros/cli`'s
 * `resolveAppUrl()` does for the `walkeros` CLI binary). Hard-cut:
 * `APP_URL` is no longer recognized.
 *
 * Lives here (not in tools/package.ts) because both the package tools and the
 * catalog resources need to resolve the same app-primary base URL. This is an
 * in-package helper, not a cross-package registry.
 */
export function getPackageBaseUrl(): string | undefined {
  return process.env.WALKEROS_APP_URL || undefined;
}

export interface CatalogEntry {
  name: string;
  version: string;
  description?: string;
  type: string;
  platform: string[];
}

export interface CatalogResult {
  entries: CatalogEntry[];
  warnings: string[];
}

/**
 * Provenance of the most recent `fetchCatalog` call. Module-scoped and
 * last-call-wins: the stdio MCP is a single process, so the diagnostics tool
 * reads which source (`app` vs `npm` fallback) served the last catalog fetch,
 * how many entries it produced, and whether any were dropped (partial).
 * `undefined` until the first fetch.
 */
export interface LastCatalogFetchInfo {
  source: 'app' | 'npm';
  count: number;
  partial: boolean;
  timestamp: number;
}

let lastFetchInfo: LastCatalogFetchInfo | undefined;

export function getLastCatalogSource(): LastCatalogFetchInfo | undefined {
  return lastFetchInfo;
}

// Cache keyed by effective source (app baseUrl or 'npm'). The tool reads
// app-primary and the resources read npm-primary; a shared cache let one
// source's result leak into the other. Only complete, non-empty results are
// cached, so a transient empty/partial fetch never freezes for the TTL.
const cache = new Map<string, { entries: CatalogEntry[]; timestamp: number }>();

export function clearCatalogCache() {
  cache.clear();
}

export function normalizePlatform(platform?: unknown): string[] {
  if (platform == null) return [];
  if (typeof platform === 'string') {
    return platform === 'universal' ? ['web', 'server'] : [platform];
  }
  if (Array.isArray(platform)) {
    return platform.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

interface SourceResult {
  entries: CatalogEntry[];
  complete: boolean;
  // Number of packages the source listed before enrichment, so the caller can
  // compute how many were dropped (listed minus enriched).
  requested: number;
}

export async function fetchCatalog(filters?: {
  type?: string;
  platform?: string;
  baseUrl?: string;
}): Promise<CatalogResult> {
  const sourceKey = filters?.baseUrl ?? 'npm';
  const warnings: string[] = [];

  const cached = cache.get(sourceKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    lastFetchInfo = {
      source: filters?.baseUrl ? 'app' : 'npm',
      count: cached.entries.length,
      partial: false,
      timestamp: Date.now(),
    };
    return { entries: applyFilters(cached.entries, filters), warnings };
  }

  let result: SourceResult;
  // Which source actually served. Starts as the requested source, flips to
  // 'npm' when an app fetch fails over to the npm fallback.
  let servedBy: 'app' | 'npm' = filters?.baseUrl ? 'app' : 'npm';
  if (filters?.baseUrl) {
    try {
      result = await fetchCatalogFrom(filters.baseUrl, filters);
    } catch {
      warnings.push(
        'app catalog endpoint unavailable, fell back to npm; results may be incomplete',
      );
      servedBy = 'npm';
      try {
        result = await fetchFromNpm();
      } catch {
        lastFetchInfo = {
          source: 'npm',
          count: 0,
          partial: true,
          timestamp: Date.now(),
        };
        return { entries: [], warnings };
      }
    }
  } else {
    try {
      result = await fetchFromNpm();
    } catch {
      lastFetchInfo = {
        source: 'npm',
        count: 0,
        partial: true,
        timestamp: Date.now(),
      };
      return { entries: [], warnings };
    }
  }

  const dropped = result.requested - result.entries.length;
  if (dropped > 0) {
    warnings.push(
      `${dropped} package(s) could not be enriched and were omitted`,
    );
  }

  lastFetchInfo = {
    source: servedBy,
    count: result.entries.length,
    partial: !result.complete,
    timestamp: Date.now(),
  };

  // Only freeze a complete, non-empty result. Empty or partial fetches must
  // retry on the next call rather than serve a stale shortfall for the TTL.
  if (result.entries.length > 0 && result.complete) {
    cache.set(sourceKey, { entries: result.entries, timestamp: Date.now() });
  }

  return { entries: applyFilters(result.entries, filters), warnings };
}

async function fetchCatalogFrom(
  baseUrl: string,
  filters?: { type?: string; platform?: string },
): Promise<SourceResult> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.platform) params.set('platform', filters.platform);

  const url = `${baseUrl}/api/packages${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'X-Walkeros-Client': CLIENT_HEADER },
  });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);

  const data = (await res.json()) as { catalog: CatalogEntry[] };
  const entries = data.catalog;
  return { entries, complete: entries.length > 0, requested: entries.length };
}

async function fetchFromNpm(): Promise<SourceResult> {
  const res = await fetch(`${NPM_SEARCH_URL}?text=@walkeros/&size=250`, {
    signal: AbortSignal.timeout(10000),
    headers: { 'X-Walkeros-Client': CLIENT_HEADER },
  });
  if (!res.ok) throw new Error(`npm search failed: ${res.status}`);

  const data = (await res.json()) as {
    objects: Array<{
      package: { name: string; version: string; description?: string };
    }>;
  };

  const requested = data.objects.length;

  const metaResults = await Promise.allSettled(
    data.objects.map((obj) => enrichWithMeta(obj.package)),
  );

  const entries = metaResults
    .filter(
      (r): r is PromiseFulfilledResult<CatalogEntry | undefined> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value)
    .filter((entry): entry is CatalogEntry => entry !== undefined);

  // A non-empty npm list with fewer enriched entries means jsdelivr silently
  // dropped some packages; treat that as incomplete so it is not cached.
  const complete = requested === 0 || entries.length === requested;
  return { entries, complete, requested };
}

async function enrichWithMeta(pkg: {
  name: string;
  version: string;
  description?: string;
}): Promise<CatalogEntry | undefined> {
  try {
    const res = await fetch(
      `${JSDELIVR_BASE}/${pkg.name}@${pkg.version}/${WALKEROS_JSON_PATH}`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { 'X-Walkeros-Client': CLIENT_HEADER },
      },
    );
    if (!res.ok) return undefined;

    const json = (await res.json()) as { $meta?: Record<string, unknown> };
    const meta = json.$meta;
    if (!meta || typeof meta.type !== 'string') return undefined;

    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      type: meta.type,
      platform: normalizePlatform(meta.platform),
    };
  } catch {
    return undefined;
  }
}

function applyFilters(
  entries: CatalogEntry[],
  filters?: { type?: string; platform?: string },
): CatalogEntry[] {
  let results = entries;
  if (filters?.type) {
    results = results.filter((e) => e.type === filters.type);
  }
  if (filters?.platform) {
    // Empty platform means platform-agnostic → matches any filter
    results = results.filter(
      (e) => e.platform.length === 0 || e.platform.includes(filters.platform!),
    );
  }
  return results;
}
