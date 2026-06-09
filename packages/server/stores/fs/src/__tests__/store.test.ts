import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { Collector, Logger } from '@walkeros/core';
import { storeFsInit } from '../store';

describe('FsStore', () => {
  let tmpDir: string;

  const mockLogger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn() as unknown as Logger.ThrowFn,
    json: jest.fn(),
    scope: jest.fn().mockReturnThis(),
  };

  const mockCollector = {} as Collector.Instance;

  async function createStore(basePath: string, file?: boolean) {
    return await storeFsInit({
      collector: mockCollector,
      logger: mockLogger,
      config: { settings: { basePath }, file },
      env: {},
      id: 'test-fs',
    });
  }

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsstore-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('structured mode (default)', () => {
    it('round-trips a structured object as utf8 JSON on disk', async () => {
      const store = await createStore(tmpDir);
      const value = { tier: 'gold', count: 3, nested: { ok: true } };
      await store.set('crm/alice', value);

      // On-disk file is utf8 JSON, not an opaque binary blob.
      const onDisk = await fs.readFile(path.join(tmpDir, 'crm/alice'), 'utf-8');
      expect(JSON.parse(onDisk)).toEqual(value);

      const result = await store.get('crm/alice');
      expect(result).toEqual(value);
    });

    it('round-trips a string value', async () => {
      const store = await createStore(tmpDir);
      await store.set('greeting', 'hello world');
      expect(await store.get('greeting')).toBe('hello world');
    });

    it('round-trips a binary leaf to a Uint8Array', async () => {
      const store = await createStore(tmpDir);
      const bytes = new Uint8Array([0, 1, 2, 255, 254, 0x7f, 0x80]);
      await store.set('asset', { name: 'logo', body: bytes });

      const result = await store.get('asset');
      // toEqual asserts the decoded leaf is a Uint8Array with the exact bytes:
      // Jest distinguishes a Uint8Array from a plain array or object, so a
      // base64 string or number[] leaf would fail this assertion.
      expect(result).toEqual({ name: 'logo', body: bytes });
    });

    it('returns undefined for a missing key', async () => {
      const store = await createStore(tmpDir);
      expect(await store.get('missing')).toBeUndefined();
    });

    it('degrades to undefined on an empty file (does not throw)', async () => {
      const store = await createStore(tmpDir);
      await fs.writeFile(path.join(tmpDir, 'empty'), '');
      await expect(store.get('empty')).resolves.toBeUndefined();
    });

    it('degrades to undefined on corrupt non-JSON bytes (does not throw)', async () => {
      const store = await createStore(tmpDir);
      await fs.writeFile(path.join(tmpDir, 'corrupt'), 'not valid json {');
      await expect(store.get('corrupt')).resolves.toBeUndefined();
    });

    it('creates intermediate directories', async () => {
      const store = await createStore(tmpDir);
      await store.set('deep/nested/file', { a: 1 });
      const onDisk = await fs.readFile(
        path.join(tmpDir, 'deep', 'nested', 'file'),
        'utf-8',
      );
      expect(JSON.parse(onDisk)).toEqual({ a: 1 });
    });
  });

  describe('file mode (file: true)', () => {
    it('writes a Buffer byte-exact with no inflation', async () => {
      const store = await createStore(tmpDir, true);
      const bytes = Buffer.from([0, 1, 2, 255, 254, 0x7f, 0x80]);
      await store.set('buf', bytes);

      // On-disk file equals the input bytes exactly, identical length, no
      // base64 inflation or JSON wrapping.
      const onDisk = await fs.readFile(path.join(tmpDir, 'buf'));
      expect(onDisk.length).toBe(bytes.length);
      expect(onDisk.equals(bytes)).toBe(true);

      const result = await store.get('buf');
      if (!Buffer.isBuffer(result)) throw new Error('expected Buffer');
      expect(result.equals(bytes)).toBe(true);
    });

    it('writes a Uint8Array byte-exact', async () => {
      const store = await createStore(tmpDir, true);
      const bytes = new Uint8Array([10, 20, 30, 40]);
      await store.set('u8', bytes);

      const onDisk = await fs.readFile(path.join(tmpDir, 'u8'));
      expect(onDisk.length).toBe(bytes.length);
      expect(Array.from(onDisk)).toEqual([10, 20, 30, 40]);
    });

    it('writes a string byte-exact and get returns the raw bytes', async () => {
      const store = await createStore(tmpDir, true);
      await store.set('str', 'console.log("hi")');

      const onDisk = await fs.readFile(path.join(tmpDir, 'str'), 'utf-8');
      expect(onDisk).toBe('console.log("hi")');

      const result = await store.get('str');
      if (!Buffer.isBuffer(result)) throw new Error('expected Buffer');
      expect(result.toString()).toBe('console.log("hi")');
    });

    it('rejects a structured object with a clear error', async () => {
      const store = await createStore(tmpDir, true);
      await expect(store.set('x', { a: 1 })).rejects.toThrow(
        /Uint8Array or string/,
      );
    });
  });

  describe('delete', () => {
    it('removes a file', async () => {
      const store = await createStore(tmpDir);
      await store.set('remove', { bye: true });
      await store.delete('remove');
      await expect(fs.access(path.join(tmpDir, 'remove'))).rejects.toThrow();
    });

    it('is a no-op for a missing file', async () => {
      const store = await createStore(tmpDir);
      await expect(store.delete('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('path traversal protection', () => {
    it('rejects .. segments', async () => {
      const store = await createStore(tmpDir);
      const result = await store.get('../etc/passwd');
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('rejects absolute paths', async () => {
      const store = await createStore(tmpDir);
      const result = await store.get('/etc/passwd');
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('rejects backslash traversal', async () => {
      const store = await createStore(tmpDir);
      const result = await store.get('..\\etc\\passwd');
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('rejects set with path traversal', async () => {
      const store = await createStore(tmpDir);
      await store.set('../outside', { bad: true });
      const exists = await fs
        .access(path.join(tmpDir, '..', 'outside'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('rejects delete with path traversal', async () => {
      const store = await createStore(tmpDir);
      await store.delete('../outside');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('type and config', () => {
    it('exposes type as fs', async () => {
      const store = await createStore(tmpDir);
      expect(store.type).toBe('fs');
    });
  });
});
