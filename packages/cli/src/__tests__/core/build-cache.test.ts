import * as fs from 'fs-extra';
import * as path from 'path';
import {
  getBuildCachePath,
  isBuildCached,
  cacheBuild,
  getCachedBuild,
} from '../../core/build-cache';

describe('build-cache', () => {
  const testCacheDir = path.join('.tmp', 'test-build-cache');

  beforeEach(async () => {
    await fs.ensureDir(testCacheDir);
  });

  afterEach(async () => {
    await fs.remove(testCacheDir);
  });

  describe('getBuildCachePath', () => {
    it('generates hash-based path from config content', async () => {
      const configContent = JSON.stringify({ flow: { platform: 'web' } });
      const cachePath = await getBuildCachePath(configContent, testCacheDir);

      expect(cachePath).toMatch(/[a-f0-9]{12}\.js$/);
    });

    it('returns same path for same content on same day', async () => {
      const configContent = JSON.stringify({ flow: { platform: 'web' } });
      const path1 = await getBuildCachePath(configContent, testCacheDir);
      const path2 = await getBuildCachePath(configContent, testCacheDir);

      expect(path1).toBe(path2);
    });
  });

  describe('isBuildCached', () => {
    it('returns false when cache does not exist', async () => {
      const configContent = JSON.stringify({ flow: { platform: 'web' } });
      const cached = await isBuildCached(configContent, testCacheDir);

      expect(cached).toBe(false);
    });

    it('returns true when cache exists', async () => {
      const configContent = JSON.stringify({ flow: { platform: 'web' } });
      const cachePath = await getBuildCachePath(configContent, testCacheDir);

      await fs.ensureDir(path.dirname(cachePath));
      await fs.writeFile(cachePath, 'console.log("cached");');

      const cached = await isBuildCached(configContent, testCacheDir);
      expect(cached).toBe(true);
    });
  });

  describe('cacheBuild / getCachedBuild', () => {
    it('stores and retrieves build artifact', async () => {
      const configContent = JSON.stringify({ flow: { platform: 'web' } });
      const buildOutput = 'console.log("bundled code");';

      await cacheBuild(configContent, buildOutput, testCacheDir);
      const retrieved = await getCachedBuild(configContent, testCacheDir);

      expect(retrieved).toBe(buildOutput);
    });

    it('returns null when cache does not exist', async () => {
      const configContent = JSON.stringify({ flow: { platform: 'web' } });
      const retrieved = await getCachedBuild(configContent, testCacheDir);

      expect(retrieved).toBeNull();
    });
  });
});
