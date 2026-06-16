import { resolveBundle, isArchive } from '../../../runtime/resolve-bundle.js';
import {
  unlinkSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdtempSync,
  mkdirSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ReadableStream } from 'stream/web';
import { c as tarCreate } from 'tar';

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

const DEFAULT_WRITE_PATH = '/tmp/walkeros-flow.mjs';
// Archives extract to dirname(DEFAULT_WRITE_PATH); /app/flow does not exist in
// the test environment, so getDefaultWritePath() resolves to /tmp.
const ARCHIVE_DEST_DIR = '/tmp';
const EXTRACTED_FLOW = join(ARCHIVE_DEST_DIR, 'flow.mjs');
const EXTRACTED_MARKER = join(ARCHIVE_DEST_DIR, 'node_modules', 'marker');

/**
 * Build a gzip tarball on disk containing the given relative files (typed),
 * then read it back into a Buffer. Returns the buffer.
 */
function buildTarballBuffer(
  files: ReadonlyArray<{ name: string; content: string }>,
): Buffer {
  const stageDir = mkdtempSync(join(tmpdir(), 'walkeros-tar-src-'));
  const tarPath = join(stageDir, 'bundle.tgz');
  try {
    for (const file of files) {
      const target = join(stageDir, file.name);
      const dir = join(target, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(target, file.content, 'utf-8');
    }
    tarCreate(
      {
        gzip: true,
        sync: true,
        file: tarPath,
        cwd: stageDir,
      },
      files.map((file) => file.name),
    );
    return readFileSync(tarPath);
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

/**
 * Build a Response-like object whose body streams the given buffer.
 * The runtime only reads ok/status/statusText/body/headers.get, so this
 * typed shape covers every accessed member (jest's mockResolvedValue takes it
 * without a cast).
 */
interface FakeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: ReadableStream<Uint8Array>;
  headers: { get: (name: string) => string | null };
}

function responseFromBuffer(
  buffer: Buffer,
  contentType: string | null,
): FakeResponse {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body,
    headers: {
      get: (name: string) => (name === 'content-type' ? contentType : null),
    },
  };
}

/** Build a text Response-like object (no archive content-type). */
function textResponse(
  text: string,
  ok: boolean,
  status: number,
  statusText: string,
): {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  headers: { get: (name: string) => string | null };
} {
  return {
    ok,
    status,
    statusText,
    text: () => Promise.resolve(text),
    headers: { get: () => null },
  };
}

function cleanupExtracted(): void {
  rmSync(EXTRACTED_FLOW, { force: true });
  rmSync(join(ARCHIVE_DEST_DIR, 'node_modules'), {
    recursive: true,
    force: true,
  });
}

describe('isArchive', () => {
  it('detects .tar.gz path', () => {
    expect(isArchive('https://example.com/bundle.tar.gz')).toBe(true);
  });

  it('detects .tgz path', () => {
    expect(isArchive('/local/bundle.tgz')).toBe(true);
  });

  it('detects presigned .tar.gz URL with query string', () => {
    expect(
      isArchive(
        'https://s3.eu-central-1.example.com/b/bundle.tar.gz?X-Amz-Signature=abc&X-Amz-Expires=900',
      ),
    ).toBe(true);
  });

  it('detects archive via content-type when extension is absent', () => {
    expect(isArchive('https://example.com/download', 'application/gzip')).toBe(
      true,
    );
    expect(isArchive('https://example.com/download', 'application/x-tar')).toBe(
      true,
    );
  });

  it('does not flag a plain .mjs URL', () => {
    expect(isArchive('https://example.com/bundle.mjs')).toBe(false);
  });

  it('does not flag a plain .mjs URL even with a query string', () => {
    expect(isArchive('https://example.com/bundle.mjs?v=2')).toBe(false);
  });
});

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
      mockFetch.mockResolvedValue(
        textResponse('export default function() {}', true, 200, 'OK'),
      );

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
      mockFetch.mockResolvedValue(
        textResponse('export default function() {}', true, 200, 'OK'),
      );

      const result = await resolveBundle('http://localhost:3000/bundle.mjs');

      expect(result.source).toBe('url');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/bundle.mjs',
        { signal: expect.any(AbortSignal) },
      );
    });

    it('should throw on HTTP error response', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue(textResponse('', false, 404, 'Not Found'));

      await expect(
        resolveBundle('https://s3.example.com/missing.mjs'),
      ).rejects.toThrow('Failed to fetch bundle');
    });

    it('should throw on empty response body', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue(textResponse('   ', true, 200, 'OK'));

      await expect(
        resolveBundle('https://s3.example.com/empty.mjs'),
      ).rejects.toThrow('empty');
    });

    it('should throw after retries are exhausted on a persistent network error', async () => {
      // fetchOk now retries transient failures; a coded connection error is
      // retried up to 3 times, then the exhaustion error surfaces. Fake timers
      // drain the backoff sleeps so the test does not wait in real time.
      jest.useFakeTimers();
      try {
        isStdinPiped.mockReturnValue(false);
        const connError = Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        });
        mockFetch.mockRejectedValue(connError);

        const pending = resolveBundle('https://s3.example.com/bundle.mjs').then(
          () => ({ ok: true as const }),
          (error: unknown) => ({ ok: false as const, error }),
        );
        await jest.runAllTimersAsync();
        const result = await pending;

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(Error);
          if (result.error instanceof Error) {
            expect(result.error.message).toMatch(/after 3 attempts/);
          }
        }
        expect(mockFetch).toHaveBeenCalledTimes(3);
      } finally {
        jest.useRealTimers();
      }
    });

    it('retries a transient failure then resolves the bundle', async () => {
      jest.useFakeTimers();
      try {
        isStdinPiped.mockReturnValue(false);
        const connError = Object.assign(new Error('connect ECONNRESET'), {
          code: 'ECONNRESET',
        });
        mockFetch
          .mockRejectedValueOnce(connError)
          .mockResolvedValueOnce(
            textResponse('export default function() {}', true, 200, 'OK'),
          );

        const pending = resolveBundle('https://s3.example.com/bundle.mjs');
        await jest.runAllTimersAsync();
        const result = await pending;

        expect(result.source).toBe('url');
        expect(result.path).toBe(DEFAULT_WRITE_PATH);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(readFileSync(DEFAULT_WRITE_PATH, 'utf-8')).toBe(
          'export default function() {}',
        );
      } finally {
        jest.useRealTimers();
      }
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
      mockFetch.mockResolvedValue(textResponse('from url', true, 200, 'OK'));

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

  describe('archive input', () => {
    afterEach(() => {
      cleanupExtracted();
    });

    it('extracts a .tar.gz URL bundle and returns the flow.mjs path', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'flow.mjs', content: 'export default function() {}' },
        { name: 'node_modules/marker', content: 'present' },
      ]);
      mockFetch.mockResolvedValue(responseFromBuffer(tarball, null));

      const result = await resolveBundle(
        'https://s3.example.com/bundle.tar.gz',
      );

      expect(result.source).toBe('archive');
      expect(result.path).toBe(EXTRACTED_FLOW);
      expect(existsSync(EXTRACTED_FLOW)).toBe(true);
      expect(existsSync(EXTRACTED_MARKER)).toBe(true);
      expect(readFileSync(EXTRACTED_FLOW, 'utf-8')).toBe(
        'export default function() {}',
      );
    });

    it('extracts an archive detected via content-type with no extension', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'flow.mjs', content: 'export default function() {}' },
      ]);
      mockFetch.mockResolvedValue(
        responseFromBuffer(tarball, 'application/gzip'),
      );

      const result = await resolveBundle('https://s3.example.com/download');

      expect(result.source).toBe('archive');
      expect(result.path).toBe(EXTRACTED_FLOW);
      expect(existsSync(EXTRACTED_FLOW)).toBe(true);
    });

    it('extracts a local .tar.gz file (not treated as a file source)', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'flow.mjs', content: 'export default function() {}' },
        { name: 'node_modules/marker', content: 'present' },
      ]);
      const localTar = join(tmpdir(), 'walkeros-local-bundle.tar.gz');
      writeFileSync(localTar, tarball);

      try {
        const result = await resolveBundle(localTar);

        expect(result.source).toBe('archive');
        expect(result.path).toBe(EXTRACTED_FLOW);
        expect(existsSync(EXTRACTED_FLOW)).toBe(true);
        expect(existsSync(EXTRACTED_MARKER)).toBe(true);
        expect(mockFetch).not.toHaveBeenCalled();
      } finally {
        rmSync(localTar, { force: true });
      }
    });

    it('throws when the archive has no flow.mjs entry', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'other.mjs', content: 'export default function() {}' },
      ]);
      mockFetch.mockResolvedValue(responseFromBuffer(tarball, null));

      await expect(
        resolveBundle('https://s3.example.com/bundle.tar.gz'),
      ).rejects.toThrow('flow.mjs');
    });

    it('does not mask a missing flow.mjs with a stale one from a prior extract', async () => {
      isStdinPiped.mockReturnValue(false);

      // First archive delivers flow.mjs into the (stable) destDir.
      mockFetch.mockResolvedValue(
        responseFromBuffer(
          buildTarballBuffer([
            { name: 'flow.mjs', content: 'export default function() {}' },
          ]),
          null,
        ),
      );
      const first = await resolveBundle('https://s3.example.com/first.tar.gz');
      expect(first.source).toBe('archive');
      expect(existsSync(EXTRACTED_FLOW)).toBe(true);

      // Second archive into the same destDir lacks flow.mjs; it must reject
      // rather than succeed against the stale file left by the first run.
      mockFetch.mockResolvedValue(
        responseFromBuffer(
          buildTarballBuffer([
            { name: 'other.mjs', content: 'export default function() {}' },
          ]),
          null,
        ),
      );
      await expect(
        resolveBundle('https://s3.example.com/second.tar.gz'),
      ).rejects.toThrow('flow.mjs');
    });
  });
});
