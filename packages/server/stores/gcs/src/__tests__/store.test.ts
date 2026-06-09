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

function createContext(
  settings: Record<string, unknown> = {},
  config: Record<string, unknown> = {},
) {
  return {
    collector: {} as Collector.Instance,
    logger: mockLogger,
    id: 'test-gcs',
    config: {
      settings: {
        bucket: 'my-bucket',
        ...settings,
      },
      ...config,
    },
    env: {},
  };
}

async function createStore(
  settings: Record<string, unknown> = {},
  config: Record<string, unknown> = {},
) {
  return await storeGcsInit(createContext(settings, config));
}

// Connect the upload (POST) and download (GET) fetch mocks into a single
// in-memory backing store so a set -> get cycle replays the exact uploaded
// bytes, mirroring a real GCS object.
function wireBackingStore(): void {
  let storedBody: ArrayBuffer | undefined;
  mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && init.body instanceof Uint8Array) {
      const view = init.body;
      const copy = new ArrayBuffer(view.byteLength);
      new Uint8Array(copy).set(view);
      storedBody = copy;
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(storedBody ?? new ArrayBuffer(0)),
    });
  });
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
    it('issues the download request with the bearer token', async () => {
      const content = new TextEncoder().encode('"hello world"');
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

      // Structured mode decodes the utf8-JSON payload.
      expect(result).toBe('hello world');
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
      const content = new TextEncoder().encode('"data"');
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

  describe('structured mode (default)', () => {
    it('uploads serialized JSON with Content-Type application/json', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const store = await createStore();
      await store.set('crm/alice', { tier: 'gold' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/upload/storage/v1/b/my-bucket/o?uploadType=media&name=${encodeURIComponent('crm/alice')}`,
        ),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
          body: expect.any(Uint8Array),
        }),
      );
    });

    it('round-trips an object', async () => {
      wireBackingStore();

      const store = await createStore();
      const value = { tier: 'gold', count: 3, nested: { ok: true } };
      await store.set('crm/alice', value);
      const result = await store.get('crm/alice');

      expect(result).toEqual(value);
    });

    it('round-trips a binary leaf to a Uint8Array', async () => {
      wireBackingStore();

      const store = await createStore();
      const bytes = new Uint8Array([0, 1, 2, 255, 254, 0x7f, 0x80]);
      await store.set('asset', { name: 'logo', body: bytes });
      const result = await store.get('asset');

      // toEqual asserts the decoded leaf is a Uint8Array with the exact bytes:
      // Jest distinguishes a Uint8Array from a plain array or object.
      expect(result).toEqual({ name: 'logo', body: bytes });
    });

    it('degrades to undefined on an empty body (does not throw)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });
      const store = await createStore();
      await expect(store.get('empty')).resolves.toBeUndefined();
    });

    it('degrades to undefined on corrupt non-JSON bytes (does not throw)', async () => {
      const corrupt = new TextEncoder().encode('not valid json {');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () =>
          Promise.resolve(
            corrupt.buffer.slice(
              corrupt.byteOffset,
              corrupt.byteOffset + corrupt.byteLength,
            ),
          ),
      });
      const store = await createStore();
      await expect(store.get('corrupt')).resolves.toBeUndefined();
    });

    it('should reject path traversal keys', async () => {
      const store = await createStore();
      await store.set('../evil.txt', { a: 1 });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('file mode (file: true)', () => {
    it('uploads bytes byte-exact with a real mime derived from the key', async () => {
      wireBackingStore();

      const store = await createStore({}, { file: true });
      const bytes = Buffer.from('(function(){...})()');
      await store.set('js/walker.js', bytes);

      // Find the upload (POST) call and assert its content-type.
      const postCall = mockFetch.mock.calls.find(
        (c) => c[1]?.method === 'POST',
      );
      expect(postCall).toBeDefined();
      expect(postCall![1].headers['Content-Type']).toBe(
        'application/javascript',
      );

      const result = await store.get('js/walker.js');
      if (!Buffer.isBuffer(result)) throw new Error('expected Buffer');
      expect(result.equals(bytes)).toBe(true);
    });

    it('falls back to application/octet-stream for an unknown extension', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const store = await createStore({}, { file: true });
      await store.set('blob', Buffer.from([1, 2, 3]));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
          }),
        }),
      );
    });

    it('rejects a structured object with a clear error', async () => {
      const store = await createStore({}, { file: true });
      await expect(store.set('x', { a: 1 })).rejects.toThrow(
        /must be Uint8Array or string/,
      );
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
      await store.set('b.txt', { v: 1 });

      // Expect 3 fetch calls total: 1 HEAD + 1 GET + 1 POST
      // (existence check fires once, not twice)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch.mock.calls[0][1]?.method).toBe('HEAD');
    });

    it('does not poison the operation on non-404 HEAD failures', async () => {
      // HEAD returns 500: treat as non-fatal (cache true, proceed). The GET
      // then returns an empty body, which structured mode degrades to a miss
      // without throwing. The operation completing is what is under test.
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        });

      const store = await createStore({ bucket: 'transient-bucket' });
      const result = await store.get('a.txt');
      expect(result).toBeUndefined();
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

    it('prefers config.credentials over settings.credentials', async () => {
      const { createTokenProvider } = require('../auth');
      createTokenProvider.mockClear();

      const configCreds = {
        client_email: 'config@project.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\nconfig\n-----END RSA PRIVATE KEY-----',
      };
      const settingsCreds = {
        client_email: 'settings@project.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\nsettings\n-----END RSA PRIVATE KEY-----',
      };

      await createStore(
        { credentials: settingsCreds },
        { credentials: configCreds },
      );

      expect(createTokenProvider).toHaveBeenCalledWith(configCreds);
      // config path wins, so the deprecation warning does not fire
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('reads config.credentials when settings.credentials is absent', async () => {
      const { createTokenProvider } = require('../auth');
      createTokenProvider.mockClear();

      const configCreds = {
        client_email: 'config@project.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\nconfig\n-----END RSA PRIVATE KEY-----',
      };

      await createStore({}, { credentials: configCreds });

      expect(createTokenProvider).toHaveBeenCalledWith(configCreds);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('warns once on the deprecated settings.credentials path', async () => {
      const settingsCreds = {
        client_email: 'settings@project.iam.gserviceaccount.com',
        private_key:
          '-----BEGIN RSA PRIVATE KEY-----\nsettings\n-----END RSA PRIVATE KEY-----',
      };

      await createStore({ credentials: settingsCreds });

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('settings.credentials is deprecated'),
      );
    });
  });
});
