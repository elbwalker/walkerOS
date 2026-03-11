import type { Collector, Logger } from '@walkeros/core';
import { storeS3Init } from '../store';

// Mock s3mini — adjusted to actual API surface
const mockGetObjectArrayBuffer = jest.fn();
const mockPutObject = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock('s3mini', () => {
  return {
    S3mini: jest.fn().mockImplementation(() => ({
      getObjectArrayBuffer: mockGetObjectArrayBuffer,
      putObject: mockPutObject,
      deleteObject: mockDeleteObject,
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

function createContext(settings: Record<string, unknown> = {}) {
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
    },
    env: {},
  };
}

async function createStore(settings: Record<string, unknown> = {}) {
  return await storeS3Init(createContext(settings));
}

describe('storeS3Init', () => {
  beforeEach(() => {
    mockGetObjectArrayBuffer.mockReset();
    mockPutObject.mockReset();
    mockDeleteObject.mockReset();
    jest.clearAllMocks();
  });

  it('should return a store instance with type "s3"', async () => {
    const store = await createStore();
    expect(store.type).toBe('s3');
    expect(store.get).toBeDefined();
    expect(store.set).toBeDefined();
    expect(store.delete).toBeDefined();
  });

  describe('get', () => {
    it('should return Buffer for existing key', async () => {
      const content = Buffer.from('hello world');
      mockGetObjectArrayBuffer.mockResolvedValue(
        content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength,
        ),
      );

      const store = await createStore();
      const result = await store.get('test.txt');

      expect(result).toBeInstanceOf(Buffer);
      expect(Buffer.from(result as Buffer).toString()).toBe('hello world');
      expect(mockGetObjectArrayBuffer).toHaveBeenCalledWith('test.txt');
    });

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
      const content = Buffer.from('data');
      mockGetObjectArrayBuffer.mockResolvedValue(content.buffer);

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

  describe('set', () => {
    it('should upload Buffer content', async () => {
      mockPutObject.mockResolvedValue({ ok: true });

      const store = await createStore();
      const content = Buffer.from('file content');
      await store.set('test.txt', content);

      expect(mockPutObject).toHaveBeenCalledWith('test.txt', content);
    });

    it('should prepend prefix to key', async () => {
      mockPutObject.mockResolvedValue({ ok: true });

      const store = await createStore({ prefix: 'uploads' });
      await store.set('file.txt', Buffer.from('data'));

      expect(mockPutObject).toHaveBeenCalledWith(
        'uploads/file.txt',
        expect.any(Buffer),
      );
    });

    it('should reject path traversal keys', async () => {
      const store = await createStore();
      await store.set('../evil.txt', Buffer.from('bad'));
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
