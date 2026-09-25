import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { createMockLogger } from '@walkeros/core';
import {
  CACHE_COMPLETE_MARKER,
  isCacheDirComplete,
  readCacheDir,
  sweepStaleCacheTemps,
  writeCacheDir,
  type CopyDir,
} from '../atomic-cache';
import { cacheBuild, getBuildCachePath } from '../build-cache';
import { clearCache } from '../../commands/cache';

describe('atomic cache writes', () => {
  let root: string;
  let cacheDir: string;
  let dest: string;

  async function source(name: string, content: string): Promise<string> {
    const dir = path.join(root, 'src', name);
    await fs.outputFile(path.join(dir, 'index.js'), content);
    await fs.outputFile(path.join(dir, 'package.json'), '{}');
    return dir;
  }

  async function temps(): Promise<string[]> {
    const entries = await fs.readdir(cacheDir);
    return entries.filter((entry) => entry.includes('.tmp-'));
  }

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-cache-'));
    cacheDir = path.join(root, 'cache', 'packages');
    dest = path.join(cacheDir, 'pkg-key');
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it('leaves nothing at dest and warns when the copy fails midway', async () => {
    const src = await source('a', 'a');
    const logger = createMockLogger();
    const failingCopy: CopyDir = async (_from, to) => {
      await fs.outputFile(path.join(to, 'index.js'), 'partial');
      throw new Error('ENOSPC: no space left on device');
    };

    await writeCacheDir(src, dest, logger, {
      label: 'pkg@1.0.0',
      copy: failingCopy,
    });

    expect(await fs.pathExists(dest)).toBe(false);
    expect(await temps()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Package cache write failed for pkg@1.0.0: ENOSPC: no space left on device. The build continues without caching it.',
    );
  });

  it('marks a completed write as complete', async () => {
    const src = await source('a', 'a');

    await writeCacheDir(src, dest, createMockLogger());

    expect(await isCacheDirComplete(dest)).toBe(true);
    expect(await fs.readFile(path.join(dest, 'index.js'), 'utf-8')).toBe('a');
  });

  it('treats an unmarked entry as incomplete and replaces it', async () => {
    await fs.outputFile(path.join(dest, 'index.js'), 'truncated');
    expect(await isCacheDirComplete(dest)).toBe(false);

    await writeCacheDir(await source('b', 'b'), dest, createMockLogger());

    expect(await isCacheDirComplete(dest)).toBe(true);
    expect(await fs.readFile(path.join(dest, 'index.js'), 'utf-8')).toBe('b');
    expect(await temps()).toEqual([]);
  });

  it('never removes a complete entry when a later write races it', async () => {
    await fs.outputFile(path.join(dest, 'index.js'), 'first');
    await fs.outputFile(path.join(dest, CACHE_COMPLETE_MARKER), '');

    await writeCacheDir(await source('b', 'second'), dest, createMockLogger());

    expect(await fs.readFile(path.join(dest, 'index.js'), 'utf-8')).toBe(
      'first',
    );
    expect(await temps()).toEqual([]);
  });

  it('two concurrent writes over a legacy entry end with one complete entry', async () => {
    await fs.outputFile(path.join(dest, 'index.js'), 'legacy');
    const srcA = await source('a', 'a');
    const srcB = await source('b', 'b');
    const logger = createMockLogger();

    // Both copies finish before either renames, so both renames race
    // against the legacy entry and against each other.
    let arrived = 0;
    let release: () => void = () => {};
    const bothCopied = new Promise<void>((resolve) => {
      release = resolve;
    });
    const gatedCopy: CopyDir = async (from, to) => {
      await fs.copy(from, to);
      arrived += 1;
      if (arrived === 2) release();
      await bothCopied;
    };

    await Promise.all([
      writeCacheDir(srcA, dest, logger, { copy: gatedCopy }),
      writeCacheDir(srcB, dest, logger, { copy: gatedCopy }),
    ]);

    expect(await isCacheDirComplete(dest)).toBe(true);
    expect(['a', 'b']).toContain(
      await fs.readFile(path.join(dest, 'index.js'), 'utf-8'),
    );
    expect(await temps()).toEqual([]);
    expect(await fs.readdir(cacheDir)).toEqual(['pkg-key']);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('sweeps temp siblings older than an hour and keeps fresh ones', async () => {
    const stale = path.join(cacheDir, 'old-key.tmp-abcd1234');
    const fresh = path.join(cacheDir, 'new-key.tmp-efgh5678');
    await fs.outputFile(path.join(stale, 'index.js'), 'x');
    await fs.outputFile(path.join(fresh, 'index.js'), 'x');
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000);
    await fs.utimes(stale, twoHoursAgo, twoHoursAgo);

    await sweepStaleCacheTemps(cacheDir);

    expect(await fs.pathExists(stale)).toBe(false);
    expect(await fs.pathExists(fresh)).toBe(true);
  });

  it('reads an entry without its completion marker', async () => {
    await writeCacheDir(await source('a', 'a'), dest, createMockLogger());
    const target = path.join(root, 'install', 'pkg');

    await readCacheDir(dest, target);

    expect((await fs.readdir(target)).sort()).toEqual([
      'index.js',
      'package.json',
    ]);
  });

  it('cacheBuild leaves no partial file when its write fails', async () => {
    const tmpDir = path.join(root, 'tmp');
    const cachePath = await getBuildCachePath('{}', tmpDir);
    // A directory at the entry path makes the final rename fail.
    await fs.ensureDir(cachePath);

    await expect(cacheBuild('{}', 'bundle', tmpDir)).rejects.toThrow();

    const entries = await fs.readdir(path.dirname(cachePath));
    expect(entries).toEqual([path.basename(cachePath)]);
    expect((await fs.stat(cachePath)).isDirectory()).toBe(true);
  });

  it('cache clear removes stale temps with the entries', async () => {
    const tmpDir = path.join(root, 'tmp');
    const packages = path.join(tmpDir, 'cache', 'packages');
    const builds = path.join(tmpDir, 'cache', 'builds');
    await fs.outputFile(path.join(packages, 'k.tmp-abcd1234', 'index.js'), '');
    await fs.outputFile(path.join(builds, 'k.js.tmp-abcd1234'), '');

    await clearCache('packages', tmpDir);
    await clearCache('builds', tmpDir);

    expect(await fs.pathExists(packages)).toBe(false);
    expect(await fs.pathExists(builds)).toBe(false);
  });
});
