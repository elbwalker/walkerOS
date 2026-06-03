import { normalizePlatform } from '../catalog.js';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocking fetch
import { fetchCatalog, clearCatalogCache } from '../catalog.js';
import type { CatalogEntry } from '../catalog.js';

function npmSearchResponse(
  packages: { name: string; version: string; description?: string }[],
) {
  return {
    ok: true,
    json: async () => ({
      objects: packages.map((p) => ({ package: p })),
    }),
  };
}

function walkerOSJsonResponse(meta: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => ({ $meta: meta }),
  };
}

describe('normalizePlatform', () => {
  it('should return empty array for undefined', () => {
    expect(normalizePlatform(undefined)).toEqual([]);
  });

  it('should wrap string in array', () => {
    expect(normalizePlatform('web')).toEqual(['web']);
  });

  it('should convert "universal" to web+server', () => {
    expect(normalizePlatform('universal')).toEqual(['web', 'server']);
  });

  it('should pass through string arrays', () => {
    expect(normalizePlatform(['web', 'server'])).toEqual(['web', 'server']);
  });

  it('should pass through single-element arrays', () => {
    expect(normalizePlatform(['server'])).toEqual(['server']);
  });

  it('should filter non-string values from arrays', () => {
    expect(normalizePlatform([42, 'web', null] as unknown as string[])).toEqual(
      ['web'],
    );
  });

  it('should return empty array for non-string non-array', () => {
    expect(normalizePlatform(42 as unknown as string)).toEqual([]);
  });
});

describe('fetchCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCatalogCache();
  });

  it('should fetch packages from npm and enrich with walkerOS metadata', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          {
            name: '@walkeros/web-destination-gtag',
            version: '1.0.0',
            description: 'GA4',
          },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      );

    const catalog = await fetchCatalog();
    expect(catalog.entries).toEqual([
      {
        name: '@walkeros/web-destination-gtag',
        version: '1.0.0',
        description: 'GA4',
        type: 'destination',
        platform: ['web'],
      },
    ]);
  });

  it('should skip packages without walkerOS.json', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/core', version: '3.0.0' },
          { name: '@walkeros/web-destination-gtag', version: '1.0.0' },
        ]),
      )
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      );

    const catalog = await fetchCatalog();
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0].name).toBe('@walkeros/web-destination-gtag');
  });

  it('should skip packages without type in metadata', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([{ name: '@walkeros/some-pkg', version: '1.0.0' }]),
      )
      .mockResolvedValueOnce(walkerOSJsonResponse({ platform: 'web' }));

    const catalog = await fetchCatalog();
    expect(catalog.entries).toHaveLength(0);
  });

  it('should handle platform arrays from metadata', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/server-store-fs', version: '3.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'store', platform: ['web', 'server'] }),
      );

    const catalog = await fetchCatalog();
    expect(catalog.entries[0].platform).toEqual(['web', 'server']);
  });

  it('should return empty platform for packages without platform', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/server-store-fs', version: '3.0.0' },
        ]),
      )
      .mockResolvedValueOnce(walkerOSJsonResponse({ type: 'store' }));

    const catalog = await fetchCatalog();
    expect(catalog.entries[0].platform).toEqual([]);
  });

  it('should filter by type', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/web-destination-gtag', version: '1.0.0' },
          { name: '@walkeros/web-source-browser', version: '2.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'source', platform: 'web' }),
      );

    const catalog = await fetchCatalog({ type: 'destination' });
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0].type).toBe('destination');
  });

  it('should filter by platform using includes', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/web-destination-gtag', version: '1.0.0' },
          { name: '@walkeros/server-source-express', version: '2.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'source', platform: 'server' }),
      );

    const catalog = await fetchCatalog({ platform: 'web' });
    expect(catalog.entries).toHaveLength(1);
    expect(catalog.entries[0].platform).toContain('web');
  });

  it('should include platform-agnostic packages in any platform filter', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/server-store-fs', version: '3.0.0' },
        ]),
      )
      .mockResolvedValueOnce(walkerOSJsonResponse({ type: 'store' }));

    // platform: [] should match any platform filter
    const webStores = await fetchCatalog({ type: 'store', platform: 'web' });
    expect(webStores.entries).toHaveLength(1);
  });

  it('should return empty array when npm search fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const catalog = await fetchCatalog();
    expect(catalog.entries).toEqual([]);
  });

  it('should return empty array on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const catalog = await fetchCatalog();
    expect(catalog.entries).toEqual([]);
  });

  it('should cache successful results', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/web-destination-gtag', version: '1.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      );

    await fetchCatalog();
    await fetchCatalog();

    // npm search called only once (+ 1 walkerOS.json fetch)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should not cache failed searches', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await fetchCatalog();

    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/web-destination-gtag', version: '1.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      );

    const catalog = await fetchCatalog();
    expect(catalog.entries).toHaveLength(1);
  });

  it('sends X-Walkeros-Client header on baseUrl catalog fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ catalog: [], count: 0 }),
    });

    await fetchCatalog({ baseUrl: 'http://app.test' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const init = mockFetch.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      'X-Walkeros-Client': expect.stringMatching(/^walkeros-mcp\//) as unknown,
    });
  });

  it('sends X-Walkeros-Client header on npm search and jsdelivr meta fetch', async () => {
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/web-destination-gtag', version: '1.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      );

    await fetchCatalog();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const npmInit = mockFetch.mock.calls[0][1] as RequestInit;
    const jsdelivrInit = mockFetch.mock.calls[1][1] as RequestInit;
    expect(npmInit.headers).toMatchObject({
      'X-Walkeros-Client': expect.stringMatching(/^walkeros-mcp\//) as unknown,
    });
    expect(jsdelivrInit.headers).toMatchObject({
      'X-Walkeros-Client': expect.stringMatching(/^walkeros-mcp\//) as unknown,
    });
  });

  function appCatalogResponse(entries: CatalogEntry[]) {
    return {
      ok: true,
      json: async () => ({ catalog: entries, count: entries.length }),
    };
  }

  it('does not freeze an empty app result; retries on the next call', async () => {
    // Call 1: app returns empty catalog (not complete → must not cache)
    mockFetch.mockResolvedValueOnce(appCatalogResponse([]));
    const first = await fetchCatalog({ baseUrl: 'http://app.test' });
    expect(first.entries).toEqual([]);

    // Call 2: app now returns 11 entries
    const eleven: CatalogEntry[] = Array.from({ length: 11 }, (_, i) => ({
      name: `@walkeros/pkg-${i}`,
      version: '1.0.0',
      type: 'destination',
      platform: ['web'],
    }));
    mockFetch.mockResolvedValueOnce(appCatalogResponse(eleven));

    const second = await fetchCatalog({ baseUrl: 'http://app.test' });
    expect(second.entries).toHaveLength(11);
  });

  it('does not freeze a partial npm result; retries on the next call and warns about omissions', async () => {
    // Call 1: npm lists 3 packages but only 1 enriches (2 dropped by jsdelivr)
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/a', version: '1.0.0' },
          { name: '@walkeros/b', version: '1.0.0' },
          { name: '@walkeros/c', version: '1.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      )
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    const first = await fetchCatalog();
    expect(first.entries).toHaveLength(1);
    expect(first.warnings.some((w) => /omitted/.test(w))).toBe(true);

    // Call 2: all 3 enrich now → partial result was not frozen
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/a', version: '1.0.0' },
          { name: '@walkeros/b', version: '1.0.0' },
          { name: '@walkeros/c', version: '1.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      );

    const second = await fetchCatalog();
    expect(second.entries).toHaveLength(3);
    expect(second.warnings).toEqual([]);
  });

  it('caches a complete app result across two calls (one app fetch)', async () => {
    const entries: CatalogEntry[] = [
      {
        name: '@walkeros/web-destination-gtag',
        version: '1.0.0',
        type: 'destination',
        platform: ['web'],
      },
    ];
    mockFetch.mockResolvedValueOnce(appCatalogResponse(entries));

    await fetchCatalog({ baseUrl: 'http://app.test' });
    const second = await fetchCatalog({ baseUrl: 'http://app.test' });

    expect(second.entries).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('keys the cache by source: app and npm do not share a cache entry', async () => {
    const appEntries: CatalogEntry[] = [
      {
        name: '@walkeros/app-pkg',
        version: '1.0.0',
        type: 'destination',
        platform: ['web'],
      },
    ];
    // First call hits app (baseUrl), one fetch
    mockFetch.mockResolvedValueOnce(appCatalogResponse(appEntries));
    const appResult = await fetchCatalog({ baseUrl: 'http://app.test' });
    expect(appResult.entries).toHaveLength(1);
    expect(appResult.entries[0].name).toBe('@walkeros/app-pkg');

    // Second call has no baseUrl → must hit npm, not the app cache
    mockFetch
      .mockResolvedValueOnce(
        npmSearchResponse([{ name: '@walkeros/npm-pkg', version: '1.0.0' }]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'source', platform: 'server' }),
      );
    const npmResult = await fetchCatalog();
    expect(npmResult.entries).toHaveLength(1);
    expect(npmResult.entries[0].name).toBe('@walkeros/npm-pkg');

    // 1 app fetch + 1 npm search + 1 jsdelivr meta = 3 total
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('falls back from app to npm and surfaces a fallback warning', async () => {
    // app throws (network error), npm succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('app down'))
      .mockResolvedValueOnce(
        npmSearchResponse([
          { name: '@walkeros/web-destination-gtag', version: '1.0.0' },
        ]),
      )
      .mockResolvedValueOnce(
        walkerOSJsonResponse({ type: 'destination', platform: 'web' }),
      );

    const result = await fetchCatalog({ baseUrl: 'http://app.test' });
    expect(result.entries).toHaveLength(1);
    expect(result.warnings.some((w) => /fell back to npm/.test(w))).toBe(true);
  });
});
