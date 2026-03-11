import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import type { Logger } from '@walkeros/core';
import { copyIncludes } from '../bundler';

const mockLogger: Logger.Instance = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  throw: jest.fn((msg: string | Error): never => {
    throw msg instanceof Error ? msg : new Error(msg);
  }),
  json: jest.fn(),
  scope: jest.fn((): Logger.Instance => mockLogger),
};

describe('copyIncludes', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-includes-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should throw when source and destination overlap (circular)', async () => {
    const sourceDir = tmpDir;
    const outputDir = path.join(tmpDir, 'dist');
    await fs.ensureDir(outputDir);
    await fs.writeFile(path.join(outputDir, 'test.txt'), 'hello');

    await expect(
      copyIncludes(['./dist'], sourceDir, outputDir, mockLogger),
    ).rejects.toThrow(/circular/i);
  });

  it('should throw when source is parent of destination', async () => {
    const sourceDir = tmpDir;
    const outputDir = path.join(tmpDir, 'dist');
    await fs.ensureDir(outputDir);

    await expect(
      copyIncludes(['.'], sourceDir, outputDir, mockLogger),
    ).rejects.toThrow(/circular/i);
  });

  it('should copy successfully when no overlap', async () => {
    const sourceDir = tmpDir;
    const sharedDir = path.join(tmpDir, 'shared');
    const outputDir = path.join(tmpDir, 'dist');
    await fs.ensureDir(sharedDir);
    await fs.ensureDir(outputDir);
    await fs.writeFile(path.join(sharedDir, 'cred.json'), '{}');

    await copyIncludes(['./shared'], sourceDir, outputDir, mockLogger);

    expect(
      await fs.pathExists(path.join(outputDir, 'shared', 'cred.json')),
    ).toBe(true);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Copied'),
    );
  });

  it('should warn when include folder does not exist', async () => {
    const sourceDir = tmpDir;
    const outputDir = path.join(tmpDir, 'dist');
    await fs.ensureDir(outputDir);

    await copyIncludes(['./nonexistent'], sourceDir, outputDir, mockLogger);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not found'),
    );
  });
});
