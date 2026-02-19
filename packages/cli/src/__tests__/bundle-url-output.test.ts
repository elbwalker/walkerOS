import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { isUrl } from '../config/utils';

// Test the URL output upload logic in isolation
// The actual integration with bundleCommand is tested via the CLI e2e tests

describe('bundle --output URL support', () => {
  describe('isUrl detection', () => {
    it('detects https URLs', () => {
      expect(isUrl('https://s3.example.com/bucket/key?token=abc')).toBe(true);
    });

    it('detects http URLs', () => {
      expect(isUrl('http://localhost:9000/bucket/key')).toBe(true);
    });

    it('rejects file paths', () => {
      expect(isUrl('./output/bundle.mjs')).toBe(false);
      expect(isUrl('/tmp/bundle.mjs')).toBe(false);
      expect(isUrl('dist/walker.js')).toBe(false);
    });
  });

  describe('uploadBundleToUrl', () => {
    const { uploadBundleToUrl } = jest.requireActual(
      '../commands/bundle/upload',
    ) as typeof import('../commands/bundle/upload');

    let tmpFile: string;

    beforeEach(async () => {
      tmpFile = path.join(os.tmpdir(), `test-bundle-${Date.now()}.mjs`);
      await fs.writeFile(tmpFile, '// test bundle content\nexport default {};');
    });

    afterEach(async () => {
      await fs.remove(tmpFile).catch(() => {});
    });

    it('PUTs bundle content to URL on success', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      global.fetch = mockFetch;

      await uploadBundleToUrl(
        tmpFile,
        'https://s3.example.com/bucket/key?token=secret',
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://s3.example.com/bucket/key?token=secret');
      expect(init.method).toBe('PUT');
    });

    it('includes Content-Length header', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      global.fetch = mockFetch;

      await uploadBundleToUrl(tmpFile, 'https://s3.example.com/bucket/key');

      const [, init] = mockFetch.mock.calls[0];
      const content = await fs.readFile(tmpFile);
      expect(init.headers['Content-Length']).toBe(String(content.length));
    });

    it('includes Content-Type header', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      });
      global.fetch = mockFetch;

      await uploadBundleToUrl(tmpFile, 'https://s3.example.com/bucket/key');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Content-Type']).toBe('application/javascript');
    });

    it('throws on non-2xx response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });
      global.fetch = mockFetch;

      await expect(
        uploadBundleToUrl(tmpFile, 'https://s3.example.com/bucket/key'),
      ).rejects.toThrow('Upload failed: 403 Forbidden');
    });

    it('retries once on 5xx response', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
        });
      global.fetch = mockFetch;

      await uploadBundleToUrl(tmpFile, 'https://s3.example.com/bucket/key');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after 5xx retry also fails', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });
      global.fetch = mockFetch;

      await expect(
        uploadBundleToUrl(tmpFile, 'https://s3.example.com/bucket/key'),
      ).rejects.toThrow('Upload failed: 500 Internal Server Error');
    });
  });

  describe('sanitizeUrl', () => {
    const { sanitizeUrl } = jest.requireActual(
      '../commands/bundle/upload',
    ) as typeof import('../commands/bundle/upload');

    it('strips query params from URL for logging', () => {
      expect(
        sanitizeUrl(
          'https://s3.example.com/bucket/key?token=secret&expires=123',
        ),
      ).toBe('https://s3.example.com/bucket/key');
    });

    it('preserves URL without query params', () => {
      expect(sanitizeUrl('https://s3.example.com/bucket/key')).toBe(
        'https://s3.example.com/bucket/key',
      );
    });
  });
});
