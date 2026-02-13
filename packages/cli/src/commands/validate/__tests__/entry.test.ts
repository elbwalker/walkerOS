import { validateEntry } from '../validators/entry.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const flowConfig = {
  version: 1,
  flows: {
    default: {
      web: {},
      destinations: {
        snowplow: {
          package: '@walkeros/web-destination-snowplow',
          config: {
            settings: {
              collectorUrl: 'https://collector.example.com',
              appId: 'my-app',
            },
          },
        },
        api: {
          package: '@walkeros/web-destination-api',
          config: {
            settings: { url: 'https://api.example.com' },
          },
        },
      },
      sources: {
        api: {
          config: { settings: {} },
          // No package field — local source
        },
      },
    },
  },
};

describe('validateEntry (dot-notation)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should validate destinations.snowplow against fetched schema', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            walkerOS: { schema: './dist/dev/walkerOS.json' },
            version: '0.0.12',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            schemas: {
              settings: {
                type: 'object',
                properties: {
                  collectorUrl: { type: 'string' },
                  appId: { type: 'string' },
                },
                required: ['collectorUrl'],
              },
            },
          }),
      });

    const result = await validateEntry('destinations.snowplow', flowConfig);
    expect(result.valid).toBe(true);
  });

  it('should error on ambiguous key without section prefix', async () => {
    // 'api' exists in both destinations and sources
    const result = await validateEntry('api', flowConfig);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('Ambiguous');
  });

  it('should resolve unambiguous key without section prefix', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '0.0.12' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ schemas: { settings: { type: 'object' } } }),
      });

    const result = await validateEntry('snowplow', flowConfig);
    expect(result.valid).toBe(true);
  });

  it('should skip remote validation when entry has no package field', async () => {
    const result = await validateEntry('sources.api', flowConfig);
    expect(result.valid).toBe(true);
    expect(result.details.skipped).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should report validation errors for invalid settings', async () => {
    const badFlow = {
      ...flowConfig,
      flows: {
        default: {
          ...flowConfig.flows.default,
          destinations: {
            snowplow: {
              package: '@walkeros/web-destination-snowplow',
              config: { settings: {} }, // Missing required collectorUrl
            },
          },
        },
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '0.0.12' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            schemas: {
              settings: {
                type: 'object',
                properties: { collectorUrl: { type: 'string' } },
                required: ['collectorUrl'],
              },
            },
          }),
      });

    const result = await validateEntry('destinations.snowplow', badFlow);
    expect(result.valid).toBe(false);
  });

  it('should error when entry key not found', async () => {
    const result = await validateEntry('destinations.nonexistent', flowConfig);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('not found');
  });
});
