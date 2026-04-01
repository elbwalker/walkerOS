import { cacheCode, getCachedCode, isCodeCached } from '../build-cache';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

describe('code cache', () => {
  const tmpDir = path.join(os.tmpdir(), `test-code-cache-${Date.now()}`);

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('returns null on cache miss', async () => {
    const result = await getCachedCode('nonexistent-code', tmpDir);
    expect(result).toBeNull();
  });

  it('returns false for isCodeCached on miss', async () => {
    const result = await isCodeCached('nonexistent-code', tmpDir);
    expect(result).toBe(false);
  });

  it('stores and retrieves cached code', async () => {
    const codeEntry =
      'import foo from "bar"; export function wireConfig() { return {}; }';
    const compiledOutput =
      'var foo = {}; function wireConfig() { return {}; }';

    await cacheCode(codeEntry, compiledOutput, tmpDir);

    const result = await getCachedCode(codeEntry, tmpDir);
    expect(result).toBe(compiledOutput);
  });

  it('returns true for isCodeCached after caching', async () => {
    const codeEntry = 'import baz from "qux";';
    await cacheCode(codeEntry, 'compiled', tmpDir);

    const result = await isCodeCached(codeEntry, tmpDir);
    expect(result).toBe(true);
  });

  it('produces different paths for different content', async () => {
    const { getCodeCachePath } = await import('../build-cache');
    const path1 = await getCodeCachePath('content-a', tmpDir);
    const path2 = await getCodeCachePath('content-b', tmpDir);
    expect(path1).not.toBe(path2);
  });

  it('produces same path for same content', async () => {
    const { getCodeCachePath } = await import('../build-cache');
    const path1 = await getCodeCachePath('same-content', tmpDir);
    const path2 = await getCodeCachePath('same-content', tmpDir);
    expect(path1).toBe(path2);
  });
});
