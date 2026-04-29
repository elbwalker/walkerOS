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

let cache: { entries: CatalogEntry[]; timestamp: number } | undefined;

export function clearCatalogCache() {
  cache = undefined;
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

export async function fetchCatalog(filters?: {
  type?: string;
  platform?: string;
  baseUrl?: string;
}): Promise<CatalogEntry[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return applyFilters(cache.entries, filters);
  }

  let entries: CatalogEntry[];
  try {
    entries = filters?.baseUrl
      ? await fetchCatalogFrom(filters.baseUrl, filters)
      : await fetchFromNpm();
  } catch {
    try {
      entries = await fetchFromNpm();
    } catch {
      return [];
    }
  }

  cache = { entries, timestamp: Date.now() };

  return applyFilters(entries, filters);
}

async function fetchCatalogFrom(
  baseUrl: string,
  filters?: { type?: string; platform?: string },
): Promise<CatalogEntry[]> {
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
  return data.catalog;
}

async function fetchFromNpm(): Promise<CatalogEntry[]> {
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

  const metaResults = await Promise.allSettled(
    data.objects.map((obj) => enrichWithMeta(obj.package)),
  );

  return metaResults
    .filter(
      (r): r is PromiseFulfilledResult<CatalogEntry | undefined> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value)
    .filter((entry): entry is CatalogEntry => entry !== undefined);
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
