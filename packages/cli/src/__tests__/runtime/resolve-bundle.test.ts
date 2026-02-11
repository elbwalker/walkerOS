import { resolveBundle } from '../../runtime/resolve-bundle.js';
import { unlinkSync, readFileSync } from 'fs';

// Mock stdin utilities
jest.mock('../../core/stdin.js', () => ({
  isStdinPiped: jest.fn(),
  readStdin: jest.fn(),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { isStdinPiped, readStdin } = require('../../core/stdin.js');

const TEMP_BUNDLE_PATH = '/tmp/walkeros-bundle.mjs';

describe('resolveBundle', () => {
  afterEach(() => {
    jest.resetAllMocks();
    // Clean up temp file if created
    try {
      unlinkSync(TEMP_BUNDLE_PATH);
    } catch {
      // ignore if not exists
    }
  });

  describe('file path (default)', () => {
    it('should return file path as-is when no stdin and not a URL', async () => {
      isStdinPiped.mockReturnValue(false);

      const result = await resolveBundle('/app/flow/bundle.mjs');

      expect(result).toEqual({
        path: '/app/flow/bundle.mjs',
        source: 'file',
      });
    });

    it('should return relative file path as-is', async () => {
      isStdinPiped.mockReturnValue(false);

      const result = await resolveBundle('./dist/bundle.mjs');

      expect(result).toEqual({
        path: './dist/bundle.mjs',
        source: 'file',
      });
    });
  });

  describe('URL input', () => {
    it('should fetch bundle from https URL and write to temp file', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('export default function() {}'),
      });

      const result = await resolveBundle('https://s3.example.com/bundle.mjs');

      expect(result.source).toBe('url');
      expect(result.path).toBe(TEMP_BUNDLE_PATH);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://s3.example.com/bundle.mjs',
        { signal: expect.any(AbortSignal) },
      );

      // Verify file was written
      const content = readFileSync(TEMP_BUNDLE_PATH, 'utf-8');
      expect(content).toBe('export default function() {}');
    });

    it('should fetch bundle from http URL', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('export default function() {}'),
      });

      const result = await resolveBundle('http://localhost:3000/bundle.mjs');

      expect(result.source).toBe('url');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/bundle.mjs',
        { signal: expect.any(AbortSignal) },
      );
    });

    it('should throw on HTTP error response', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(''),
      });

      await expect(
        resolveBundle('https://s3.example.com/missing.mjs'),
      ).rejects.toThrow('Failed to fetch bundle');
    });

    it('should throw on empty response body', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('   '),
      });

      await expect(
        resolveBundle('https://s3.example.com/empty.mjs'),
      ).rejects.toThrow('empty');
    });

    it('should throw on network error', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        resolveBundle('https://s3.example.com/bundle.mjs'),
      ).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('stdin input', () => {
    it('should read bundle from stdin and write to temp file', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockResolvedValue('export default function() {}');

      const result = await resolveBundle('/app/flow/bundle.mjs');

      expect(result.source).toBe('stdin');
      expect(result.path).toBe(TEMP_BUNDLE_PATH);
      expect(readStdin).toHaveBeenCalled();

      // Verify file was written
      const content = readFileSync(TEMP_BUNDLE_PATH, 'utf-8');
      expect(content).toBe('export default function() {}');
    });

    it('should prioritize stdin over URL', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockResolvedValue('export default function() {}');

      const result = await resolveBundle('https://s3.example.com/bundle.mjs');

      expect(result.source).toBe('stdin');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should propagate readStdin errors', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockRejectedValue(new Error('No input received on stdin'));

      await expect(resolveBundle('/app/flow/bundle.mjs')).rejects.toThrow(
        'No input received on stdin',
      );
    });
  });

  describe('priority order', () => {
    it('stdin > URL > file: stdin wins when piped even with URL env', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockResolvedValue('from stdin');

      const result = await resolveBundle('https://example.com/bundle.mjs');

      expect(result.source).toBe('stdin');
    });

    it('URL > file: URL wins over file path', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('from url'),
      });

      const result = await resolveBundle('https://example.com/bundle.mjs');

      expect(result.source).toBe('url');
    });

    it('file is the fallback when no stdin and no URL', async () => {
      isStdinPiped.mockReturnValue(false);

      const result = await resolveBundle('/app/flow/bundle.mjs');

      expect(result.source).toBe('file');
    });
  });
});
