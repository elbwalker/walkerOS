import { normalizePlatform } from '../catalog.js';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocking fetch
import { fetchCatalog, clearCatalogCache } from '../catalog.js';

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
    expect(normalizePlatform([42, 'web', null])).toEqual(['web']);
  });

  it('should return empty array for non-string non-array', () => {
    expect(normalizePlatform(42)).toEqual([]);
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

  it.each([
    [
      'an HTTP error',
      () => mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }),
    ],
    [
      'a network error',
      () => mockFetch.mockRejectedValueOnce(new Error('Network error')),
    ],
  ])(
    'answers an empty catalog with a warning naming npm on %s',
    async (_label, arrange) => {
      arrange();
      const catalog = await fetchCatalog();
      expect(catalog.entries).toEqual([]);
      expect(catalog.warnings).toEqual([
        expect.stringMatching(/npm package search failed/),
      ]);
    },
  );

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
    const npmInit = mockFetch.mock.calls[0][1];
    const jsdelivrInit = mockFetch.mock.calls[1][1];
    expect(npmInit.headers).toMatchObject({
      'X-Walkeros-Client': expect.stringMatching(/^walkeros-mcp\//),
    });
    expect(jsdelivrInit.headers).toMatchObject({
      'X-Walkeros-Client': expect.stringMatching(/^walkeros-mcp\//),
    });
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
});
