import { fetchPackageSchema, fetchPackage } from '..';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('fetchPackageSchema', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should fetch package.json then walkerOS.json and return info', async () => {
    const mockPkgJson = {
      name: '@walkeros/web-destination-snowplow',
      version: '0.0.12',
      walkerOS: { type: 'destination', platform: 'web' },
    };
    const mockWalkerOSJson = {
      $meta: {
        package: '@walkeros/web-destination-snowplow',
        version: '0.0.12',
        type: 'destination',
        platform: 'web',
      },
      schemas: { settings: { type: 'object', properties: {} } },
      examples: { mapping: {} },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPkgJson),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWalkerOSJson),
      });

    const result = await fetchPackageSchema(
      '@walkeros/web-destination-snowplow',
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        'cdn.jsdelivr.net/npm/@walkeros/web-destination-snowplow@latest/package.json',
      ),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('dist/walkerOS.json'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    expect(result.packageName).toBe('@walkeros/web-destination-snowplow');
    expect(result.version).toBe('0.0.12');
    expect(result.type).toBe('destination');
    expect(result.platform).toBe('web');
    expect(result.schemas).toEqual(mockWalkerOSJson.schemas);
    expect(result.examples).toEqual(mockWalkerOSJson.examples);
  });

  it('should always use convention path dist/walkerOS.json', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'some-pkg', version: '1.0.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ schemas: { settings: {} } }),
      });

    await fetchPackageSchema('some-pkg');

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('dist/walkerOS.json'),
      expect.any(Object),
    );
  });

  it('should throw when package not found', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(fetchPackageSchema('nonexistent')).rejects.toThrow(
      'Package "nonexistent" not found on npm (HTTP 404)',
    );
  });

  it('should throw when walkerOS.json not found', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'pkg', version: '1.0.0' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(fetchPackageSchema('pkg')).rejects.toThrow(
      'walkerOS.json not found',
    );
  });

  it('should support version parameter', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'pkg', version: '2.0.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ schemas: {} }),
      });

    await fetchPackageSchema('pkg', { version: '2.0.0' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('pkg@2.0.0'),
      expect.any(Object),
    );
  });

  it('should return empty objects when schemas/examples are missing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'pkg', version: '1.0.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    const result = await fetchPackageSchema('pkg');
    expect(result.schemas).toEqual({});
    expect(result.examples).toEqual({});
  });

  it('should pass AbortSignal to fetch calls', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: 'pkg', version: '1.0.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ schemas: {} }),
      });

    await fetchPackageSchema('pkg', { timeout: 5000 });

    // Both fetch calls should receive an AbortSignal
    for (const call of mockFetch.mock.calls) {
      expect(call[1]).toEqual(
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    }
  });
});

describe('fetchPackage', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockPkgJson = {
    name: '@walkeros/web-destination-gtag',
    version: '2.1.1',
    description: 'Google gtag destination',
  };

  const mockWalkerOSJson = {
    $meta: { type: 'destination', platform: 'web' },
    schemas: { settings: { type: 'object' } },
    examples: {
      step: {
        purchase: { description: 'GA4 purchase', in: {}, out: [] },
        pageView: { in: {}, out: [] },
      },
    },
    hints: {
      'consent-mode': { text: 'Consent Mode v2 enabled by default' },
    },
  };

  function setupMocks() {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPkgJson),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWalkerOSJson),
      });
  }

  it('should return full package info with summaries', async () => {
    setupMocks();
    const result = await fetchPackage('@walkeros/web-destination-gtag');
    expect(result.packageName).toBe('@walkeros/web-destination-gtag');
    expect(result.version).toBe('2.1.1');
    expect(result.description).toBe('Google gtag destination');
    expect(result.type).toBe('destination');
    expect(result.platform).toBe('web');
    expect(result.schemas).toEqual({ settings: { type: 'object' } });
    expect(result.examples).toBeDefined();
    expect(result.hints).toBeDefined();
  });

  it('should extract hint keys', async () => {
    setupMocks();
    const result = await fetchPackage('@walkeros/web-destination-gtag');
    expect(result.hintKeys).toEqual(['consent-mode']);
  });

  it('should extract example summaries with descriptions', async () => {
    setupMocks();
    const result = await fetchPackage('@walkeros/web-destination-gtag');
    expect(result.exampleSummaries).toEqual([
      { name: 'purchase', description: 'GA4 purchase' },
      { name: 'pageView' },
    ]);
  });

  it('should throw when walkerOS.json not found', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPkgJson),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(
      fetchPackage('@walkeros/web-destination-gtag'),
    ).rejects.toThrow('walkerOS.json not found');
  });

  it('should extract docs and source from $meta', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPkgJson),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            $meta: {
              docs: 'https://www.walkeros.io/docs/destinations/web/gtag',
              source:
                'https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/gtag/src',
            },
            schemas: {},
          }),
      });
    const result = await fetchPackage('@walkeros/web-destination-gtag');
    expect(result.docs).toBe(
      'https://www.walkeros.io/docs/destinations/web/gtag',
    );
    expect(result.source).toBe(
      'https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/gtag/src',
    );
  });

  it('should handle missing hints and examples', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPkgJson),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ $meta: {}, schemas: {} }),
      });
    const result = await fetchPackage('@walkeros/web-destination-gtag');
    expect(result.hints).toBeUndefined();
    expect(result.examples).toEqual({});
    expect(result.hintKeys).toEqual([]);
    expect(result.exampleSummaries).toEqual([]);
  });
});
