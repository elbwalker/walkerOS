import {
  getPackageCacheKey,
  getFlowConfigCacheKey,
  isMutableVersion,
} from '../../core/cache-utils';

describe('cache-utils', () => {
  describe('isMutableVersion', () => {
    it('returns true for "latest"', () => {
      expect(isMutableVersion('latest')).toBe(true);
    });

    it('returns true for caret versions', () => {
      expect(isMutableVersion('^0.4.0')).toBe(true);
    });

    it('returns true for tilde versions', () => {
      expect(isMutableVersion('~0.4.0')).toBe(true);
    });

    it('returns false for exact versions', () => {
      expect(isMutableVersion('0.4.1')).toBe(false);
    });

    it('returns true for versions with "x" placeholder', () => {
      expect(isMutableVersion('0.4.x')).toBe(true);
    });
  });

  describe('getPackageCacheKey', () => {
    const fixedDate = '2025-11-25';

    it('includes date for mutable version "latest"', async () => {
      const key = await getPackageCacheKey(
        '@walkeros/core',
        'latest',
        fixedDate,
      );
      expect(key).toMatch(/^[a-f0-9]{12}$/); // 12 char hex hash

      // Same input = same output
      const key2 = await getPackageCacheKey(
        '@walkeros/core',
        'latest',
        fixedDate,
      );
      expect(key).toBe(key2);
    });

    it('excludes date for exact version', async () => {
      const day1Key = await getPackageCacheKey(
        '@walkeros/core',
        '0.4.1',
        '2025-11-25',
      );
      const day2Key = await getPackageCacheKey(
        '@walkeros/core',
        '0.4.1',
        '2025-11-26',
      );
      expect(day1Key).toBe(day2Key); // Same - date not included
    });

    it('different dates produce different keys for mutable versions', async () => {
      const day1Key = await getPackageCacheKey(
        '@walkeros/core',
        'latest',
        '2025-11-25',
      );
      const day2Key = await getPackageCacheKey(
        '@walkeros/core',
        'latest',
        '2025-11-26',
      );
      expect(day1Key).not.toBe(day2Key);
    });
  });

  describe('getFlowConfigCacheKey', () => {
    const fixedDate = '2025-11-25';

    it('produces consistent hash for same content', async () => {
      const content = JSON.stringify({ flow: { platform: 'web' }, build: {} });
      const key1 = await getFlowConfigCacheKey(content, fixedDate);
      const key2 = await getFlowConfigCacheKey(content, fixedDate);
      expect(key1).toBe(key2);
    });

    it('normalizes whitespace differences', async () => {
      const compact = '{"flow":{"platform":"web"}}';
      const formatted = '{\n  "flow": {\n    "platform": "web"\n  }\n}';

      const key1 = await getFlowConfigCacheKey(compact, fixedDate);
      const key2 = await getFlowConfigCacheKey(formatted, fixedDate);
      expect(key1).toBe(key2);
    });

    it('different content produces different keys', async () => {
      const content1 = JSON.stringify({ flow: { platform: 'web' } });
      const content2 = JSON.stringify({ flow: { platform: 'server' } });

      const key1 = await getFlowConfigCacheKey(content1, fixedDate);
      const key2 = await getFlowConfigCacheKey(content2, fixedDate);
      expect(key1).not.toBe(key2);
    });

    it('different dates produce different keys', async () => {
      const content = JSON.stringify({ flow: { platform: 'web' } });
      const key1 = await getFlowConfigCacheKey(content, '2025-11-25');
      const key2 = await getFlowConfigCacheKey(content, '2025-11-26');
      expect(key1).not.toBe(key2);
    });
  });
});
