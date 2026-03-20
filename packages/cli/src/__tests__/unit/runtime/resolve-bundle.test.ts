import { resolveBundle } from '../../../runtime/resolve-bundle.js';
import { unlinkSync, readFileSync, writeFileSync } from 'fs';

// Mock stdin utilities
jest.mock('../../../core/stdin.js', () => ({
  isStdinPiped: jest.fn(),
  readStdin: jest.fn(),
}));

// Mock global fetch via spy (auto-restores via restoreMocks: true)
const mockFetch = jest.fn();

beforeEach(() => {
  jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);
  mockFetch.mockReset();
});

const { isStdinPiped, readStdin } = require('../../../core/stdin.js');

const DEFAULT_WRITE_PATH = '/tmp/walkeros-bundle.mjs';

describe('resolveBundle', () => {
  afterEach(() => {
    jest.resetAllMocks();
    try {
      unlinkSync(DEFAULT_WRITE_PATH);
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
    it('should fetch bundle from https URL and write to default path', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('export default function() {}'),
      });

      const result = await resolveBundle('https://s3.example.com/bundle.mjs');

      expect(result.source).toBe('url');
      expect(result.path).toBe(DEFAULT_WRITE_PATH);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://s3.example.com/bundle.mjs',
        { signal: expect.any(AbortSignal) },
      );

      const content = readFileSync(DEFAULT_WRITE_PATH, 'utf-8');
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
    it('should read bundle from stdin and write to default path', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockResolvedValue('export default function() {}');

      const result = await resolveBundle('/nonexistent/bundle.mjs');

      expect(result.source).toBe('stdin');
      expect(result.path).toBe(DEFAULT_WRITE_PATH);
      expect(readStdin).toHaveBeenCalled();

      const content = readFileSync(DEFAULT_WRITE_PATH, 'utf-8');
      expect(content).toBe('export default function() {}');
    });

    it('should propagate readStdin errors', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockRejectedValue(new Error('No input received on stdin'));

      await expect(resolveBundle('/nonexistent/bundle.mjs')).rejects.toThrow(
        'No input received on stdin',
      );
    });
  });

  describe('priority order', () => {
    it('existing file wins over everything (Docker detached mode fix)', async () => {
      const tmpFile = '/tmp/walkeros-resolve-test-bundle.mjs';
      writeFileSync(tmpFile, 'export default function() {}');

      isStdinPiped.mockReturnValue(true);

      try {
        const result = await resolveBundle(tmpFile);

        expect(result.source).toBe('file');
        expect(result.path).toBe(tmpFile);
        expect(readStdin).not.toHaveBeenCalled();
      } finally {
        unlinkSync(tmpFile);
      }
    });

    it('URL wins over stdin when no existing file', async () => {
      isStdinPiped.mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('from url'),
      });

      const result = await resolveBundle('https://example.com/bundle.mjs');

      expect(result.source).toBe('url');
      expect(readStdin).not.toHaveBeenCalled();
    });

    it('stdin used when BUNDLE is non-existent file path', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockResolvedValue('from stdin');

      const result = await resolveBundle('/nonexistent/bundle.mjs');

      expect(result.source).toBe('stdin');
      expect(readStdin).toHaveBeenCalled();
    });

    it('file fallback when no file exists, no URL, no stdin', async () => {
      isStdinPiped.mockReturnValue(false);

      const result = await resolveBundle('/app/flow/bundle.mjs');

      expect(result.source).toBe('file');
    });
  });
});
