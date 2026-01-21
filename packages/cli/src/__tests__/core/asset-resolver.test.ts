import { resolveAsset } from '../../core/asset-resolver.js';

describe('resolveAsset', () => {
  describe('URL handling', () => {
    it('should preserve HTTPS URLs as-is', () => {
      const url = 'https://www.walkeros.io/flows/gcp-bigquery.json';
      expect(resolveAsset(url, 'config')).toBe(url);
    });

    it('should preserve HTTP URLs as-is', () => {
      const url = 'http://example.com/config.json';
      expect(resolveAsset(url, 'config')).toBe(url);
    });
  });
});
