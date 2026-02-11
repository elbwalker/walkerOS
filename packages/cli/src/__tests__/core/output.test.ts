import { writeResult } from '../../core/output.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('writeResult', () => {
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should write string content to stdout when no output path given', async () => {
    await writeResult('hello world', {});

    expect(stdoutWriteSpy).toHaveBeenCalledWith('hello world');
  });

  it('should write Buffer content to stdout when no output path given', async () => {
    const buf = Buffer.from('binary content');
    await writeResult(buf, {});

    expect(stdoutWriteSpy).toHaveBeenCalledWith(buf);
  });

  it('should write content to file when output path given', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writeresult-'));
    const outFile = path.join(tmpDir, 'result.txt');

    await writeResult('file content', { output: outFile });

    const written = await fs.readFile(outFile, 'utf-8');
    expect(written).toBe('file content');
    expect(stdoutWriteSpy).not.toHaveBeenCalled();

    await fs.remove(tmpDir);
  });

  it('should create parent directories when writing to file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writeresult-'));
    const outFile = path.join(tmpDir, 'nested', 'dir', 'result.txt');

    await writeResult('nested content', { output: outFile });

    const written = await fs.readFile(outFile, 'utf-8');
    expect(written).toBe('nested content');

    await fs.remove(tmpDir);
  });
});
