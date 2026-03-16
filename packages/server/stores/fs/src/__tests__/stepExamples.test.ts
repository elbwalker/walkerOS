import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { Collector, Logger } from '@walkeros/core';
import { storeFsInit } from '../store';
import { examples } from '../dev';

describe('Step Examples', () => {
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
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fsstore-step-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('readExistingFile — read a file from the store directory', async () => {
    const example = examples.step.readExistingFile;
    const input = example.in as { operation: string; key: string };

    // Pre-populate the file
    await fs.writeFile(path.join(tmpDir, input.key), 'console.log("walkerOS")');

    const store = await createStore(tmpDir);
    const result = await store.get(input.key);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result!.toString()).toBe('console.log("walkerOS")');
  });

  it('writeNewFile — write creates intermediate directories', async () => {
    const example = examples.step.writeNewFile;
    const input = example.in as {
      operation: string;
      key: string;
      value: string;
    };

    const store = await createStore(tmpDir);
    const content = Buffer.from('(function(){...})()');
    await store.set(input.key, content);

    const filePath = path.join(tmpDir, input.key);
    const written = await fs.readFile(filePath);
    expect(written.toString()).toBe('(function(){...})()');
  });

  it('pathTraversalRejection — .. segments are rejected', async () => {
    const example = examples.step.pathTraversalRejection;
    const input = example.in as { operation: string; key: string };

    const store = await createStore(tmpDir);
    const result = await store.get(input.key);

    expect(result).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});
