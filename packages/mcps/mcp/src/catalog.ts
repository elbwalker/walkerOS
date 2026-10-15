// __VERSION__ is replaced at build time by tsup's `define` (see tsup.config.ts).
// In tests, it's set on globalThis (see src/__tests__/support/version.ts).
declare const __VERSION__: string;

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/npm';
const WALKEROS_JSON_PATH = 'dist/walkerOS.json';
const CACHE_TTL = 5 * 60 * 1000;

export const CLIENT_HEADER = 'walkeros-mcp/' + __VERSION__;

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

// Only complete, non-empty results are cached, so a transient empty or
// partial fetch never freezes for the TTL.
let cached: { entries: CatalogEntry[]; timestamp: number } | undefined;

export function clearCatalogCache() {
  cached = undefined;
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
}): Promise<CatalogResult> {
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { entries: applyFilters(cached.entries, filters), warnings: [] };
  }
  let result: SourceResult;
  try {
    result = await fetchFromNpm();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      entries: [],
      warnings: [
        `npm package search failed (${reason}); the package catalog is empty. Try again, or use package_get with an exact package name.`,
      ],
    };
  }
  const warnings: string[] = [];
  const dropped = result.requested - result.entries.length;
  if (dropped > 0)
    warnings.push(
      `${dropped} package(s) could not be enriched and were omitted`,
    );
  if (result.entries.length > 0 && result.complete)
    cached = { entries: result.entries, timestamp: Date.now() };
  return { entries: applyFilters(result.entries, filters), warnings };
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
