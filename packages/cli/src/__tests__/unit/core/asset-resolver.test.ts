import path from 'path';
import { resolveAsset } from '../../../core/asset-resolver.js';

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

  describe('bare filename resolution', () => {
    it('should resolve bare filename relative to cwd', () => {
      const result = resolveAsset('flow.json', 'config');
      expect(result).toBe(path.resolve(process.cwd(), 'flow.json'));
    });

    it('should resolve bare filename with custom baseDir', () => {
      const result = resolveAsset('flow.json', 'config', '/tmp/myproject');
      expect(result).toBe(path.join('/tmp/myproject', 'flow.json'));
    });

    it('should not resolve to examples directory', () => {
      const result = resolveAsset('flow.json', 'config');
      expect(result).not.toContain('examples');
    });
  });

  describe('relative path resolution', () => {
    it('should resolve relative paths from cwd', () => {
      const result = resolveAsset('./config/flow.json', 'config');
      expect(result).toBe(path.resolve(process.cwd(), './config/flow.json'));
    });

    it('should resolve parent-relative paths from baseDir', () => {
      const result = resolveAsset('../flow.json', 'config', '/tmp/myproject');
      expect(result).toBe(path.resolve('/tmp/myproject', '../flow.json'));
    });
  });

  describe('absolute path resolution', () => {
    it('should return absolute paths as-is', () => {
      const abs = '/home/user/flow.json';
      expect(resolveAsset(abs, 'config')).toBe(abs);
    });
  });
});
