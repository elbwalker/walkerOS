jest.mock('../auth', () => ({
  createTokenProvider: jest.fn(() => jest.fn().mockResolvedValue('mock-token')),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import type { Collector, Logger } from '@walkeros/core';
import { storeGcsInit } from '../store';
import { examples } from '../dev';

const mockLogger: Logger.Instance = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  throw: jest.fn() as unknown as Logger.ThrowFn,
  json: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

function createContext(settings: Record<string, unknown> = {}) {
  return {
    collector: {} as Collector.Instance,
    logger: mockLogger,
    id: 'test-gcs',
    config: {
      settings: {
        bucket: 'my-bucket',
        ...settings,
      },
    },
    env: {},
  };
}

async function createStore(settings: Record<string, unknown> = {}) {
  return await storeGcsInit(createContext(settings));
}

describe('Step Examples', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.clearAllMocks();
  });

  it('readWithAdc — read object from GCS using ADC', async () => {
    const example = examples.step.readWithAdc;
    const input = example.in as { operation: string; key: string };

    const content = new TextEncoder().encode('(function(){...})()');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () =>
        Promise.resolve(
          content.buffer.slice(
            content.byteOffset,
            content.byteOffset + content.byteLength,
          ),
        ),
    });

    const store = await createStore();
    const result = await store.get(input.key);

    expect(result).toBeInstanceOf(Buffer);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/o/${encodeURIComponent(input.key)}`),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      }),
    );
  });

  it('prefixScoping — key is scoped under configured prefix', async () => {
    const example = examples.step.prefixScoping;
    const input = example.in as {
      operation: string;
      key: string;
      settings: { bucket: string; prefix: string };
    };
    const [, gcsPath] = example.out![0] as readonly [string, string, unknown];

    const content = new TextEncoder().encode('data');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () =>
        Promise.resolve(
          content.buffer.slice(
            content.byteOffset,
            content.byteOffset + content.byteLength,
          ),
        ),
    });

    const store = await createStore({
      bucket: input.settings.bucket,
      prefix: input.settings.prefix,
    });
    await store.get(input.key);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/o/${encodeURIComponent(gcsPath)}`),
      expect.anything(),
    );
  });
});
