import {
  resolveBundle,
  isArchive,
  isGzip,
  isPrebuiltArtifact,
} from '../resolve-bundle.js';
import {
  unlinkSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdtempSync,
  mkdirSync,
} from 'fs';
import { dirname, join } from 'path';
import os, { tmpdir } from 'os';
import { ReadableStream } from 'stream/web';
import { c as tarCreate } from 'tar';

// Mock stdin utilities
jest.mock('../stdin.js', () => ({
  isStdinPiped: jest.fn(),
  readStdin: jest.fn(),
}));

// Mock global fetch via spy (auto-restores via restoreMocks: true)
const mockFetch = jest.fn();

beforeEach(() => {
  jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);
  mockFetch.mockReset();
});

const { isStdinPiped, readStdin } = require('../stdin.js');

// /app/flow does not exist in the test environment, so every fetched, piped
// or extracted bundle lands in a private folder under os.tmpdir(). Each test
// gets a temp directory of its own (restoreMocks undoes the spy).
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'runner-resolve-root-'));
  jest.spyOn(os, 'tmpdir').mockReturnValue(root);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** The private folder a resolve made: directly under the temp root, holding flow/flow.mjs. */
function privateFolder(result: { path: string; folder?: string }): string {
  const folder = result.folder;
  if (folder === undefined) throw new Error('resolveBundle made no folder');
  expect(dirname(folder)).toBe(root);
  expect(result.path).toBe(join(folder, 'flow', 'flow.mjs'));
  return folder;
}

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
 * Build a Response-like object whose body streams the given buffer, and
 * whose arrayBuffer() resolves to the same bytes (resolveBundle buffers every
 * URL body via arrayBuffer() before routing it; body/headers.get cover the
 * remaining accessed members). jest's mockResolvedValue takes this shape
 * without a cast.
 */
interface FakeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: ReadableStream<Uint8Array>;
  arrayBuffer: () => Promise<ArrayBuffer>;
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
  // Copy into a fresh, exactly-sized ArrayBuffer: Node may back small
  // buffers (these fixtures are well under the pooling threshold) with a
  // shared, larger ArrayBufferLike, so buffer.buffer alone can carry
  // unrelated bytes and isn't guaranteed to be a plain ArrayBuffer.
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body,
    arrayBuffer: () => Promise.resolve(arrayBuffer),
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
): FakeResponse {
  return {
    ...responseFromBuffer(Buffer.from(text, 'utf-8'), null),
    ok,
    status,
    statusText,
  };
}

describe('isPrebuiltArtifact', () => {
  it.each(['flow.mjs', 'flow.js', 'flow.cjs', 'bundle.tar.gz', 'bundle.tgz'])(
    'accepts %s',
    (path) => {
      expect(isPrebuiltArtifact(`/app/flow/${path}`)).toBe(true);
    },
  );

  it.each(['flow.json', 'flow.ts', 'flow', 'flow.mjs.json'])(
    'refuses %s',
    (path) => {
      expect(isPrebuiltArtifact(`/app/flow/${path}`)).toBe(false);
    },
  );
});

describe('isGzip', () => {
  it('detects the gzip magic bytes', () => {
    expect(isGzip(Uint8Array.from([0x1f, 0x8b, 0x08]))).toBe(true);
  });

  it('rejects text and short buffers', () => {
    expect(isGzip(Buffer.from('export default 1'))).toBe(false);
    expect(isGzip(Uint8Array.from([0x1f]))).toBe(false);
  });
});

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
    it('writes a fetched text bundle as flow.mjs into a private folder', async () => {
      isStdinPiped.mockReturnValue(false);
      mockFetch.mockResolvedValue(
        textResponse('export default function() {}', true, 200, 'OK'),
      );

      const result = await resolveBundle('https://s3.example.com/bundle.mjs');

      expect(result.source).toBe('url');
      privateFolder(result);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://s3.example.com/bundle.mjs',
        { signal: expect.any(AbortSignal) },
      );

      const content = readFileSync(result.path, 'utf-8');
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
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(readFileSync(result.path, 'utf-8')).toBe(
          'export default function() {}',
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('stdin input', () => {
    it('writes a piped bundle as flow.mjs into a private folder', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockResolvedValue('export default function() {}');

      const result = await resolveBundle('/nonexistent/bundle.mjs');

      expect(result.source).toBe('stdin');
      privateFolder(result);
      expect(readStdin).toHaveBeenCalled();

      const content = readFileSync(result.path, 'utf-8');
      expect(content).toBe('export default function() {}');
    });

    it('falls through to the file source on an empty stdin (detached container)', async () => {
      isStdinPiped.mockReturnValue(true);
      readStdin.mockResolvedValue('');

      const result = await resolveBundle('/nonexistent/bundle.mjs');

      expect(result).toEqual({
        path: '/nonexistent/bundle.mjs',
        source: 'file',
      });
    });
  });

  describe('priority order', () => {
    it('existing file wins over everything (Docker detached mode fix)', async () => {
      const tmpFile = join(root, 'walkeros-resolve-test-bundle.mjs');
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
    it('extracts a .tar.gz URL bundle into a private folder and returns the flow.mjs path', async () => {
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
      const folder = privateFolder(result);
      expect(existsSync(join(folder, 'flow', 'node_modules', 'marker'))).toBe(
        true,
      );
      expect(readFileSync(result.path, 'utf-8')).toBe(
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
      privateFolder(result);
      expect(existsSync(result.path)).toBe(true);
    });

    it('extracts a gzip body at a suffix-less URL served as octet-stream (the body decides)', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'flow.mjs', content: 'export default function() {}' },
      ]);
      mockFetch.mockResolvedValue(
        responseFromBuffer(tarball, 'application/octet-stream'),
      );

      const result = await resolveBundle(
        'https://s3.example.com/artifacts/abc123?X-Amz-Signature=sig',
      );

      expect(result.source).toBe('archive');
      privateFolder(result);
      expect(readFileSync(result.path, 'utf-8')).toBe(
        'export default function() {}',
      );
    });

    it('extracts a local .tar.gz file (not treated as a file source)', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'flow.mjs', content: 'export default function() {}' },
        { name: 'node_modules/marker', content: 'present' },
      ]);
      const localTar = join(root, 'walkeros-local-bundle.tar.gz');
      writeFileSync(localTar, tarball);

      const result = await resolveBundle(localTar);

      expect(result.source).toBe('archive');
      const folder = privateFolder(result);
      expect(existsSync(result.path)).toBe(true);
      expect(existsSync(join(folder, 'flow', 'node_modules', 'marker'))).toBe(
        true,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('gives two resolves of the same archive two folders', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'flow.mjs', content: 'export default function() {}' },
      ]);
      const localTar = join(root, 'walkeros-local-bundle.tar.gz');
      writeFileSync(localTar, tarball);

      const first = await resolveBundle(localTar);
      const second = await resolveBundle(localTar);

      expect(privateFolder(first)).not.toBe(privateFolder(second));
      expect(existsSync(first.path)).toBe(true);
      expect(existsSync(second.path)).toBe(true);
    });

    it('leaves the files directly under the temp directory as they were', async () => {
      isStdinPiped.mockReturnValue(false);
      mkdirSync(join(root, 'node_modules'));
      writeFileSync(join(root, 'node_modules', 'marker'), 'another tool');
      writeFileSync(join(root, 'flow.mjs'), 'another flow');
      writeFileSync(join(root, 'package.json'), '{"name":"another"}');
      mockFetch.mockResolvedValue(
        responseFromBuffer(
          buildTarballBuffer([
            { name: 'flow.mjs', content: 'export default function() {}' },
            { name: 'node_modules/marker', content: 'present' },
            { name: 'package.json', content: '{"type":"module"}' },
          ]),
          null,
        ),
      );

      await resolveBundle('https://s3.example.com/bundle.tar.gz');

      expect(readFileSync(join(root, 'node_modules', 'marker'), 'utf-8')).toBe(
        'another tool',
      );
      expect(readFileSync(join(root, 'flow.mjs'), 'utf-8')).toBe(
        'another flow',
      );
      expect(readFileSync(join(root, 'package.json'), 'utf-8')).toBe(
        '{"name":"another"}',
      );
    });

    it('throws when the archive has no flow.mjs entry, and leaves no folder behind', async () => {
      isStdinPiped.mockReturnValue(false);
      const tarball = buildTarballBuffer([
        { name: 'other.mjs', content: 'export default function() {}' },
      ]);
      mockFetch.mockResolvedValue(responseFromBuffer(tarball, null));

      await expect(
        resolveBundle('https://s3.example.com/bundle.tar.gz'),
      ).rejects.toThrow('flow.mjs');
      expect(readdirSync(root)).toEqual([]);
    });
  });
});
