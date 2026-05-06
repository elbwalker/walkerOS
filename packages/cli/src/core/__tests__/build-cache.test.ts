import {
  cacheCode,
  getCachedCode,
  isCodeCached,
  getCodeCachePath,
} from '../build-cache';
import type { CodeCacheKeyInputs } from '../build-cache';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

describe('code cache', () => {
  const tmpDir = path.join(os.tmpdir(), `test-code-cache-${Date.now()}`);

  // Fixed inputs for tests that don't care about cache key inputs themselves.
  // Tests that need to vary inputs live in unit/bundle/externals.test.ts.
  const inputs: CodeCacheKeyInputs = {
    externals: new Set<string>(),
    platform: 'node',
    target: 'node20',
    nodeMajor: 20,
    format: 'esm',
    minify: false,
    minifyOptions: undefined,
    windowCollector: undefined,
    windowElb: undefined,
    versionsHash: 'test',
  };

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('returns null on cache miss', async () => {
    const result = await getCachedCode('nonexistent-code', tmpDir, inputs);
    expect(result).toBeNull();
  });

  it('returns false for isCodeCached on miss', async () => {
    const result = await isCodeCached('nonexistent-code', tmpDir, inputs);
    expect(result).toBe(false);
  });

  it('stores and retrieves cached code', async () => {
    const codeEntry =
      'import foo from "bar"; export function wireConfig() { return {}; }';
    const compiledOutput = 'var foo = {}; function wireConfig() { return {}; }';

    await cacheCode(codeEntry, compiledOutput, tmpDir, inputs);

    const result = await getCachedCode(codeEntry, tmpDir, inputs);
    expect(result).toBe(compiledOutput);
  });

  it('returns true for isCodeCached after caching', async () => {
    const codeEntry = 'import baz from "qux";';
    await cacheCode(codeEntry, 'compiled', tmpDir, inputs);

    const result = await isCodeCached(codeEntry, tmpDir, inputs);
    expect(result).toBe(true);
  });

  it('produces different paths for different content', async () => {
    const path1 = await getCodeCachePath('content-a', tmpDir, inputs);
    const path2 = await getCodeCachePath('content-b', tmpDir, inputs);
    expect(path1).not.toBe(path2);
  });

  it('produces same path for same content', async () => {
    const path1 = await getCodeCachePath('same-content', tmpDir, inputs);
    const path2 = await getCodeCachePath('same-content', tmpDir, inputs);
    expect(path1).toBe(path2);
  });
});
