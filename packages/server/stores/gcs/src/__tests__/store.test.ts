jest.mock('../auth', () => ({
  createTokenProvider: jest.fn(() => jest.fn().mockResolvedValue('mock-token')),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import type { Collector, Logger } from '@walkeros/core';
import {
  storeGcsInit,
  __resetBucketExistenceCache,
  __seedBucketExists,
} from '../store';

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

describe('storeGcsInit', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    jest.clearAllMocks();
    __resetBucketExistenceCache();
    // Pre-seed the default bucket as existing so legacy tests do not need
    // to mock the existence HEAD call. Tests that exercise the existence
    // path explicitly reset the cache first.
    __seedBucketExists('my-bucket');
  });

  it('should return a store instance with type "gcs"', async () => {
    const store = await createStore();
    expect(store.type).toBe('gcs');
    expect(store.get).toBeDefined();
    expect(store.set).toBeDefined();
    expect(store.delete).toBeDefined();
  });

  describe('get', () => {
    it('should return Buffer for existing key', async () => {
      const content = new TextEncoder().encode('hello world');
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
      const result = await store.get('test.txt');

      expect(result).toBeInstanceOf(Buffer);
      expect(Buffer.from(result as Buffer).toString()).toBe('hello world');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.googleapis.com/download/storage/v1/b/my-bucket/o/test.txt?alt=media',
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        }),
      );
    });

    it('should return undefined for 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const store = await createStore();
      const result = await store.get('missing.txt');

      expect(result).toBeUndefined();
    });

    it('should return undefined on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = await createStore();
      const result = await store.get('fail.txt');

      expect(result).toBeUndefined();
    });

    it('should prepend prefix to key', async () => {
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

      const store = await createStore({ prefix: 'assets/v1' });
      await store.get('walker.js');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/o/${encodeURIComponent('assets/v1/walker.js')}`,
        ),
        expect.anything(),
      );
    });

    it('should reject path traversal keys', async () => {
      const store = await createStore();

      expect(await store.get('../etc/passwd')).toBeUndefined();
      expect(await store.get('/absolute/path')).toBeUndefined();
      expect(await store.get('foo/../../bar')).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject empty keys', async () => {
      const store = await createStore();
      expect(await store.get('')).toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should upload Buffer content with correct Content-Type', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const store = await createStore();
      const content = Buffer.from('file content');
      await store.set('test.txt', content);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/upload/storage/v1/b/my-bucket/o?uploadType=media&name=test.txt',
        ),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer mock-token',
            'Content-Type': 'application/octet-stream',
          },
          body: content,
        }),
      );
    });

    it('should prepend prefix to key', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const store = await createStore({ prefix: 'uploads' });
      await store.set('file.txt', Buffer.from('data'));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `&name=${encodeURIComponent('uploads/file.txt')}`,
        ),
        expect.anything(),
      );
    });

    it('should reject path traversal keys', async () => {
      const store = await createStore();
      await store.set('../evil.txt', Buffer.from('bad'));
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an object', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const store = await createStore();
      await store.delete('old.txt');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.googleapis.com/storage/v1/b/my-bucket/o/old.txt',
        expect.objectContaining({
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-token' },
        }),
      );
    });

    it('should not throw on missing key', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Not Found'));

      const store = await createStore();
      await expect(store.delete('missing.txt')).resolves.toBeUndefined();
    });
  });

  describe('bucket existence hard-fail', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.GOOGLE_CLOUD_PROJECT;
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      // Override the default seeding so the existence check actually fires.
      __resetBucketExistenceCache();
    });

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.GOOGLE_CLOUD_PROJECT;
      } else {
        process.env.GOOGLE_CLOUD_PROJECT = originalEnv;
      }
    });

    it('throws actionable error when bucket does not exist on first operation', async () => {
      // First call: HEAD returns 404 (bucket not found)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const store = await createStore();
      await expect(store.get('foo')).rejects.toThrow(
        'GCS bucket not found: my-bucket in project test-project. Run "walkeros setup store.test-gcs" to create it.',
      );
    });

    it('memoizes the existence check across operations', async () => {
      // HEAD ok, then both subsequent fetches use the cached result
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        })
        .mockResolvedValueOnce({ ok: true });

      const store = await createStore({ bucket: 'memoize-bucket' });
      await store.get('a.txt');
      await store.set('b.txt', Buffer.from('x'));

      // Expect 3 fetch calls total: 1 HEAD + 1 GET + 1 POST
      // (existence check fires once, not twice)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[0][1]?.method).toBe('HEAD');
    });

    it('does not poison the operation on non-404 HEAD failures', async () => {
      // HEAD returns 500: treat as non-fatal (cache true, proceed)
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        });

      const store = await createStore({ bucket: 'transient-bucket' });
      const result = await store.get('a.txt');
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('credentials parsing', () => {
    it('should accept string credentials (JSON)', async () => {
      const { createTokenProvider } = require('../auth');
      createTokenProvider.mockClear();

      const saJson = JSON.stringify({
        client_email: 'sa@project.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\nkey\n-----END RSA PRIVATE KEY-----',
      });

      await createStore({ credentials: saJson });

      expect(createTokenProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          client_email: 'sa@project.iam.gserviceaccount.com',
        }),
      );
    });

    it('should accept object credentials', async () => {
      const { createTokenProvider } = require('../auth');
      createTokenProvider.mockClear();

      const creds = {
        client_email: 'sa@project.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\nkey\n-----END RSA PRIVATE KEY-----',
      };

      await createStore({ credentials: creds });

      expect(createTokenProvider).toHaveBeenCalledWith(creds);
    });

    it('should use ADC when no credentials provided', async () => {
      const { createTokenProvider } = require('../auth');
      createTokenProvider.mockClear();

      await createStore();

      expect(createTokenProvider).toHaveBeenCalledWith(undefined);
    });
  });
});
