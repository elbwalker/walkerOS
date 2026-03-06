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

  async function createStore(basePath: string) {
    return await storeFsInit({
      collector: mockCollector,
      logger: mockLogger,
      config: { settings: { basePath } },
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

  describe('get', () => {
    it('should return Buffer for existing files', async () => {
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello');
      const store = await createStore(tmpDir);
      const result = await store.get('test.txt');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result!.toString()).toBe('hello');
    });

    it('should return undefined for missing files', async () => {
      const store = await createStore(tmpDir);
      const result = await store.get('missing.txt');
      expect(result).toBeUndefined();
    });

    it('should read from subdirectories', async () => {
      await fs.mkdir(path.join(tmpDir, 'js'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'js', 'walker.js'),
        'console.log("hi")',
      );
      const store = await createStore(tmpDir);
      const result = await store.get('js/walker.js');
      expect(result!.toString()).toBe('console.log("hi")');
    });
  });

  describe('set', () => {
    it('should write a file', async () => {
      const store = await createStore(tmpDir);
      await store.set('output.txt', Buffer.from('written'));
      const content = await fs.readFile(
        path.join(tmpDir, 'output.txt'),
        'utf-8',
      );
      expect(content).toBe('written');
    });

    it('should create intermediate directories', async () => {
      const store = await createStore(tmpDir);
      await store.set('deep/nested/file.txt', Buffer.from('deep'));
      const content = await fs.readFile(
        path.join(tmpDir, 'deep', 'nested', 'file.txt'),
        'utf-8',
      );
      expect(content).toBe('deep');
    });
  });

  describe('delete', () => {
    it('should remove a file', async () => {
      await fs.writeFile(path.join(tmpDir, 'remove.txt'), 'bye');
      const store = await createStore(tmpDir);
      await store.delete('remove.txt');
      await expect(
        fs.access(path.join(tmpDir, 'remove.txt')),
      ).rejects.toThrow();
    });

    it('should be a no-op for missing files', async () => {
      const store = await createStore(tmpDir);
      await expect(store.delete('nonexistent.txt')).resolves.toBeUndefined();
    });
  });

  describe('path traversal protection', () => {
    it('should reject .. segments', async () => {
      const store = await createStore(tmpDir);
      const result = await store.get('../etc/passwd');
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should reject absolute paths', async () => {
      const store = await createStore(tmpDir);
      const result = await store.get('/etc/passwd');
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should reject backslash traversal', async () => {
      const store = await createStore(tmpDir);
      const result = await store.get('..\\etc\\passwd');
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should reject set with path traversal', async () => {
      const store = await createStore(tmpDir);
      await store.set('../outside.txt', Buffer.from('bad'));
      const exists = await fs
        .access(path.join(tmpDir, '..', 'outside.txt'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it('should reject delete with path traversal', async () => {
      const store = await createStore(tmpDir);
      await store.delete('../outside.txt');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('type and config', () => {
    it('should expose type as fs', async () => {
      const store = await createStore(tmpDir);
      expect(store.type).toBe('fs');
    });
  });
});
