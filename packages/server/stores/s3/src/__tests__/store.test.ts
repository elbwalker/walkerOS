import type { Collector, Logger } from '@walkeros/core';
import { storeS3Init } from '../store';

// Mock s3mini — adjusted to actual API surface
const mockGetObjectArrayBuffer = jest.fn();
const mockPutObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockBucketExists = jest.fn();
const mockCreateBucket = jest.fn();

jest.mock('s3mini', () => {
  return {
    S3mini: jest.fn().mockImplementation(() => ({
      getObjectArrayBuffer: mockGetObjectArrayBuffer,
      putObject: mockPutObject,
      deleteObject: mockDeleteObject,
      bucketExists: mockBucketExists,
      createBucket: mockCreateBucket,
    })),
  };
});

const mockLogger: Logger.Instance = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  throw: jest.fn() as unknown as Logger.ThrowFn,
  json: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

function createContext(settings: Record<string, unknown> = {}, file?: boolean) {
  return {
    collector: {} as Collector.Instance,
    logger: mockLogger,
    id: 'test-s3',
    config: {
      settings: {
        bucket: 'my-bucket',
        endpoint: 'https://s3.us-east-1.amazonaws.com',
        accessKeyId: 'AKID',
        secretAccessKey: 'secret',
        ...settings,
      },
      file,
    },
    env: {},
  };
}

async function createStore(
  settings: Record<string, unknown> = {},
  file?: boolean,
) {
  return await storeS3Init(createContext(settings, file));
}

describe('storeS3Init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetObjectArrayBuffer.mockReset();
    mockPutObject.mockReset();
    mockDeleteObject.mockReset();
    mockBucketExists.mockReset();
    mockCreateBucket.mockReset();
    // Default to bucket existing so existing tests are unaffected by the
    // new init-time bucket-exists guard.
    mockBucketExists.mockResolvedValue(true);
  });

  it('should return a store instance with type "s3"', async () => {
    const store = await createStore();
    expect(store.type).toBe('s3');
    expect(store.get).toBeDefined();
    expect(store.set).toBeDefined();
    expect(store.delete).toBeDefined();
  });

  it('should throw an actionable error when the bucket does not exist', async () => {
    mockBucketExists.mockResolvedValue(false);
    await expect(createStore()).rejects.toThrow(
      /S3 bucket not found: my-bucket.*walkeros setup store\.test-s3/,
    );
  });

  // Connect the put/get mocks into a single in-memory backing store so a
  // set -> get cycle replays the exact bytes the store handed the client.
  function wireBackingStore(): { reads: () => Buffer | undefined } {
    let stored: Buffer | undefined;
    mockPutObject.mockImplementation(
      async (_key: string, value: Uint8Array | string) => {
        stored = Buffer.from(value);
        return { ok: true };
      },
    );
    mockGetObjectArrayBuffer.mockImplementation(async () => {
      if (!stored) return null;
      return stored.buffer.slice(
        stored.byteOffset,
        stored.byteOffset + stored.byteLength,
      );
    });
    return { reads: () => stored };
  }

  describe('get', () => {
    it('should return undefined for missing key (null response)', async () => {
      mockGetObjectArrayBuffer.mockResolvedValue(null);

      const store = await createStore();
      const result = await store.get('missing.txt');

      expect(result).toBeUndefined();
    });

    it('should return undefined on error', async () => {
      mockGetObjectArrayBuffer.mockRejectedValue(new Error('NoSuchKey'));

      const store = await createStore();
      const result = await store.get('missing.txt');

      expect(result).toBeUndefined();
    });

    it('should prepend prefix to key', async () => {
      const content = Buffer.from('{}');
      mockGetObjectArrayBuffer.mockResolvedValue(
        content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength,
        ),
      );

      const store = await createStore({ prefix: 'assets/v1' });
      await store.get('walker.js');

      expect(mockGetObjectArrayBuffer).toHaveBeenCalledWith(
        'assets/v1/walker.js',
      );
    });

    it('should reject path traversal keys', async () => {
      const store = await createStore();

      expect(await store.get('../etc/passwd')).toBeUndefined();
      expect(await store.get('/absolute/path')).toBeUndefined();
      expect(await store.get('foo/../../bar')).toBeUndefined();
      expect(mockGetObjectArrayBuffer).not.toHaveBeenCalled();
    });

    it('should reject empty keys', async () => {
      const store = await createStore();
      expect(await store.get('')).toBeUndefined();
      expect(mockGetObjectArrayBuffer).not.toHaveBeenCalled();
    });
  });

  describe('structured mode (default)', () => {
    it('round-trips an object and stores it as application/json', async () => {
      wireBackingStore();

      const store = await createStore();
      const value = { tier: 'gold', count: 3, nested: { ok: true } };
      await store.set('crm/alice', value);

      expect(mockPutObject).toHaveBeenCalledWith(
        'crm/alice',
        expect.any(Uint8Array),
        'application/json',
      );

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

    it('degrades to undefined on an empty object (does not throw)', async () => {
      mockGetObjectArrayBuffer.mockResolvedValue(new ArrayBuffer(0));
      const store = await createStore();
      await expect(store.get('empty')).resolves.toBeUndefined();
    });

    it('degrades to undefined on corrupt non-JSON bytes (does not throw)', async () => {
      const corrupt = Buffer.from('not valid json {');
      mockGetObjectArrayBuffer.mockResolvedValue(
        corrupt.buffer.slice(
          corrupt.byteOffset,
          corrupt.byteOffset + corrupt.byteLength,
        ),
      );
      const store = await createStore();
      await expect(store.get('corrupt')).resolves.toBeUndefined();
    });

    it('reject path traversal keys', async () => {
      const store = await createStore();
      await store.set('../evil.txt', { a: 1 });
      expect(mockPutObject).not.toHaveBeenCalled();
    });
  });

  describe('file mode (file: true)', () => {
    it('uploads a Buffer byte-exact with a real mime derived from the key', async () => {
      const { reads } = wireBackingStore();

      const store = await createStore({}, true);
      const bytes = Buffer.from('(function(){...})()');
      await store.set('js/walker.js', bytes);

      expect(mockPutObject).toHaveBeenCalledWith(
        'js/walker.js',
        bytes,
        'application/javascript',
      );
      const stored = reads();
      if (!stored) throw new Error('expected stored bytes');
      expect(stored.equals(bytes)).toBe(true);

      const result = await store.get('js/walker.js');
      if (!Buffer.isBuffer(result)) throw new Error('expected Buffer');
      expect(result.equals(bytes)).toBe(true);
    });

    it('falls back to application/octet-stream for an unknown extension', async () => {
      wireBackingStore();

      const store = await createStore({}, true);
      await store.set('blob', Buffer.from([1, 2, 3]));

      expect(mockPutObject).toHaveBeenCalledWith(
        'blob',
        expect.any(Buffer),
        'application/octet-stream',
      );
    });

    it('rejects a structured object with a clear error', async () => {
      const store = await createStore({}, true);
      await expect(store.set('x', { a: 1 })).rejects.toThrow(
        /must be Uint8Array or string/,
      );
      expect(mockPutObject).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an object', async () => {
      mockDeleteObject.mockResolvedValue(true);

      const store = await createStore();
      await store.delete('old.txt');

      expect(mockDeleteObject).toHaveBeenCalledWith('old.txt');
    });

    it('should not throw on missing key', async () => {
      mockDeleteObject.mockRejectedValue(new Error('NoSuchKey'));

      const store = await createStore();
      await expect(store.delete('missing.txt')).resolves.toBeUndefined();
    });
  });

  describe('constructor', () => {
    it('should pass settings to S3mini constructor with bucket in endpoint', async () => {
      const { S3mini } = require('s3mini');
      S3mini.mockClear();

      await createStore({
        endpoint: 'https://s3.fr-par.scw.cloud',
        bucket: 'my-bucket',
        region: 'fr-par',
      });

      expect(S3mini).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://s3.fr-par.scw.cloud/my-bucket',
          region: 'fr-par',
          accessKeyId: 'AKID',
          secretAccessKey: 'secret',
        }),
      );
    });

    it('should default region to "auto"', async () => {
      const { S3mini } = require('s3mini');
      S3mini.mockClear();

      await createStore();

      expect(S3mini).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'auto',
        }),
      );
    });

    it('should normalize endpoint trailing slash', async () => {
      const { S3mini } = require('s3mini');
      S3mini.mockClear();

      await createStore({
        endpoint: 'https://s3.amazonaws.com/',
        bucket: 'test',
      });

      expect(S3mini).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://s3.amazonaws.com/test',
        }),
      );
    });
  });
});
