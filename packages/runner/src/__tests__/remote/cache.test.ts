import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
} from 'fs';
import { execFileSync } from 'child_process';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { c as tarCreate } from 'tar';
import type { RefusalCheck, ReleaseDocument } from '@walkeros/core';
import { createReleaseCache, type ReleaseCache } from '../../remote/cache.js';
import { ReleaseRefusal, sha256Hex } from '../../remote/release-document.js';
import { createMockLogger } from '../helpers/mock-logger.js';
import {
  FIXTURE_DEPLOYMENT,
  archiveOf,
  buildRelease,
  type ReleaseFixture,
} from '../helpers/release-fixture.js';

let root: string;
let cacheDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'walkeros-cache-test-'));
  cacheDir = join(root, 'cache');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

async function* chunksOf(
  bytes: Uint8Array,
  size = 1024,
): AsyncGenerator<Uint8Array> {
  for (let at = 0; at < bytes.byteLength; at += size)
    yield bytes.subarray(at, at + size);
}

function filesIn(folder: string): string[] {
  return existsSync(folder) ? readdirSync(folder).sort() : [];
}

async function refusalOf(work: Promise<unknown>): Promise<ReleaseRefusal> {
  try {
    await work;
  } catch (error) {
    if (error instanceof ReleaseRefusal) return error;
    throw error;
  }
  throw new Error('no refusal');
}

async function cacheWith(...releases: ReleaseFixture[]): Promise<ReleaseCache> {
  const cache = await createReleaseCache(cacheDir, createMockLogger());
  for (const release of releases)
    await cache.storeDocument(release.documentBytes, release.documentSha256);
  return cache;
}

async function storedRelease(sequence = 17): Promise<{
  cache: ReleaseCache;
  release: ReleaseFixture;
  logger: ReturnType<typeof createMockLogger>;
}> {
  const logger = createMockLogger();
  const cache = await createReleaseCache(cacheDir, logger);
  const release = await buildRelease({ sequence });
  await cache.storeArtifact(chunksOf(release.archive), release.artifact);
  return { cache, release, logger };
}

function flipOneByte(path: string): void {
  const bytes = readFileSync(path);
  bytes[Math.floor(bytes.length / 2)] ^= 0xff;
  writeFileSync(path, bytes);
}

describe('createReleaseCache', () => {
  it('makes documents/ and artifacts/ and nothing else', async () => {
    await createReleaseCache(cacheDir, createMockLogger());

    expect(filesIn(cacheDir)).toEqual(['artifacts', 'documents']);
  });

  it('names a cache folder it cannot write', async () => {
    writeFileSync(join(root, 'file'), 'x');

    await expect(
      createReleaseCache(join(root, 'file', 'cache'), createMockLogger()),
    ).rejects.toThrow(
      `The cache folder ${join(root, 'file', 'cache')} cannot be written: ENOTDIR: not a directory`,
    );
  });
});

describe('documents', () => {
  it('writes documents/<sha>.json through a temporary name and a rename', async () => {
    const release = await buildRelease({ sequence: 17 });
    const cache = await cacheWith(release);

    expect(filesIn(join(cacheDir, 'documents'))).toEqual([
      `${release.documentSha256}.json`,
    ]);
    expect(
      new Uint8Array(
        await readFile(
          join(cacheDir, 'documents', `${release.documentSha256}.json`),
        ),
      ),
    ).toEqual(release.documentBytes);
    expect(await cache.documents(FIXTURE_DEPLOYMENT)).toEqual([
      { sha256: release.documentSha256, document: release.document },
    ]);
  });

  it.each<[string, (path: string, bytes: Uint8Array) => void]>([
    ['a FIFO', (path) => execFileSync('mkfifo', [path])],
    [
      'a symbolic link',
      (path, bytes) => {
        const target = join(root, 'elsewhere.json');
        writeFileSync(target, bytes);
        symlinkSync(target, path);
      },
    ],
  ])('skips %s under a document name, with one WARN', async (_case, plant) => {
    const release = await buildRelease({ sequence: 17 });
    const logger = createMockLogger();
    const cache = await createReleaseCache(cacheDir, logger);
    plant(
      join(cacheDir, 'documents', `${release.documentSha256}.json`),
      release.documentBytes,
    );

    expect(await cache.documents(FIXTURE_DEPLOYMENT)).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      `Cached release document sha256 ${release.documentSha256.slice(0, 12)} skipped (document-format)`,
    );
  });

  it('refuses to store bytes under another sha256', async () => {
    const release = await buildRelease({ sequence: 17 });
    const cache = await cacheWith();

    await expect(
      cache.storeDocument(release.documentBytes, 'b'.repeat(64)),
    ).rejects.toThrow('The document bytes do not hash to');
    expect(filesIn(join(cacheDir, 'documents'))).toEqual([]);
  });

  it('skips a document of another deployment, one that does not hash to its name, one that does not read and one above the cap', async () => {
    const good = await buildRelease({ sequence: 17 });
    const other = await buildRelease({ sequence: 18, deployment: 'dep_other' });
    const cache = await cacheWith(good, other);
    const documents = join(cacheDir, 'documents');
    const misnamed = await buildRelease({ sequence: 19 });
    writeFileSync(
      join(documents, `${'c'.repeat(64)}.json`),
      misnamed.documentBytes,
    );
    const unreadable = new TextEncoder().encode('{"version":1}');
    writeFileSync(join(documents, `${sha256Hex(unreadable)}.json`), unreadable);
    writeFileSync(
      join(documents, `${misnamed.documentSha256}.json.tmp-0123456789abcdef`),
      misnamed.documentBytes,
    );
    const oversized = new TextEncoder().encode(
      JSON.stringify({ ...misnamed.document, notes: 'n'.repeat(65_536) }),
    );
    writeFileSync(join(documents, `${sha256Hex(oversized)}.json`), oversized);

    expect(await cache.documents(FIXTURE_DEPLOYMENT)).toEqual([
      { sha256: good.documentSha256, document: good.document },
    ]);
  });

  it('derives the high-water mark from the deployment', async () => {
    const releases = await Promise.all([
      buildRelease({ sequence: 15, secretsSince: 15 }),
      buildRelease({ sequence: 17, secretsSince: 12 }),
      buildRelease({ sequence: 16, secretsSince: 16 }),
      buildRelease({ sequence: 30, secretsSince: 30, deployment: 'dep_other' }),
    ]);
    const cache = await cacheWith(...releases);

    expect(await cache.highWater(FIXTURE_DEPLOYMENT)).toEqual({
      sequence: 17,
      sha256: releases[1].documentSha256,
    });
  });

  it.each<[string, (documents: string) => Promise<string>, string[]]>([
    [
      'a damaged document writes one WARN across two loads',
      async (documents) => {
        const release = await buildRelease({ sequence: 19 });
        const path = join(documents, `${release.documentSha256}.json`);
        writeFileSync(path, release.documentBytes);
        flipOneByte(path);
        return `Cached release document sha256 ${release.documentSha256.slice(0, 12)} skipped (document-format)`;
      },
      ['warn'],
    ],
    [
      "another deployment's document writes no line",
      async (documents) => {
        const other = await buildRelease({
          sequence: 19,
          deployment: 'dep_other',
        });
        writeFileSync(
          join(documents, `${other.documentSha256}.json`),
          other.documentBytes,
        );
        return '';
      },
      [],
    ],
  ])('%s', async (_case, place, levels) => {
    const logger = createMockLogger();
    const cache = await createReleaseCache(cacheDir, logger);
    const line = await place(join(cacheDir, 'documents'));

    await cache.documents(FIXTURE_DEPLOYMENT);
    await cache.documents(FIXTURE_DEPLOYMENT);

    const watched: Array<'error' | 'warn' | 'info'> = ['error', 'warn', 'info'];
    const written = watched.flatMap((level) =>
      jest.mocked(logger[level]).mock.calls.map(() => level),
    );
    expect(written).toEqual(levels);
    if (line) expect(logger.warn).toHaveBeenCalledWith(line);
    expect(filesIn(join(cacheDir, 'documents'))).toHaveLength(1);
  });

  it('answers no high-water mark without documents', async () => {
    const cache = await cacheWith(await buildRelease({ sequence: 3 }));

    expect(await cache.highWater('dep_none')).toBeUndefined();
  });
});

describe('storeArtifact', () => {
  it('leaves artifacts/<sha>.tgz with the bytes and no temporary file', async () => {
    const { release } = await storedRelease();

    expect(filesIn(join(cacheDir, 'artifacts'))).toEqual([
      `${release.artifact.sha256}.tgz`,
    ]);
    expect(
      new Uint8Array(
        await readFile(
          join(cacheDir, 'artifacts', `${release.artifact.sha256}.tgz`),
        ),
      ),
    ).toEqual(release.archive);
  });

  it('stops at the first chunk past the size with artifact-bytes', async () => {
    const cache = await cacheWith();
    const release = await buildRelease({ sequence: 17 });
    let pulled = 0;
    let closed = false;
    async function* longer(): AsyncGenerator<Uint8Array> {
      try {
        for (;;) {
          pulled += 1;
          yield new Uint8Array(release.artifact.bytes);
        }
      } finally {
        closed = true;
      }
    }

    const refusal = await refusalOf(
      cache.storeArtifact(longer(), release.artifact),
    );

    expect([refusal.check, pulled, closed]).toEqual([
      'artifact-bytes',
      2,
      true,
    ]);
    expect(filesIn(join(cacheDir, 'artifacts'))).toEqual([]);
  });

  it.each<[string, (archive: Uint8Array) => Uint8Array, RefusalCheck]>([
    [
      'too few bytes',
      (archive) => archive.subarray(0, archive.length - 1),
      'artifact-bytes',
    ],
    ['no bytes', () => new Uint8Array(0), 'artifact-bytes'],
    [
      'other bytes of the same size',
      (archive) => {
        const other = new Uint8Array(archive);
        other[0] ^= 0xff;
        return other;
      },
      'artifact-sha256',
    ],
  ])(
    'refuses %s and leaves no object and no temporary file',
    async (_case, change, check) => {
      const cache = await cacheWith();
      const release = await buildRelease({ sequence: 17 });

      const refusal = await refusalOf(
        cache.storeArtifact(
          chunksOf(change(release.archive)),
          release.artifact,
        ),
      );

      expect(refusal.check).toBe(check);
      expect(filesIn(join(cacheDir, 'artifacts'))).toEqual([]);
    },
  );

  it('passes a failure of the chunks through and leaves no temporary file', async () => {
    const cache = await cacheWith();
    const release = await buildRelease({ sequence: 17 });
    async function* broken(): AsyncGenerator<Uint8Array> {
      yield release.archive.subarray(0, 10);
      throw new Error('socket closed');
    }

    await expect(
      cache.storeArtifact(broken(), release.artifact),
    ).rejects.toThrow('socket closed');
    expect(filesIn(join(cacheDir, 'artifacts'))).toEqual([]);
  });

  it('leaves one good object when two instances store one release at once', async () => {
    const release = await buildRelease({ sequence: 17 });
    const first = await createReleaseCache(cacheDir, createMockLogger());
    const second = await createReleaseCache(cacheDir, createMockLogger());

    await Promise.all([
      first.storeArtifact(chunksOf(release.archive, 97), release.artifact),
      second.storeArtifact(chunksOf(release.archive, 131), release.artifact),
    ]);

    expect(filesIn(join(cacheDir, 'artifacts'))).toEqual([
      `${release.artifact.sha256}.tgz`,
    ]);
    expect(await first.checkArtifact(release.artifact)).toBe(true);
  });
});

describe('checkArtifact', () => {
  it('answers true for a good object', async () => {
    const { cache, release, logger } = await storedRelease();

    expect(await cache.checkArtifact(release.artifact)).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('answers false for an object that is not cached, with no line', async () => {
    const { cache, logger } = await storedRelease();
    const missing = await buildRelease({ sequence: 18, flowName: 'other' });

    expect(await cache.checkArtifact(missing.artifact)).toBe(false);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each<[string, (path: string) => void]>([
    ['one byte flipped', flipOneByte],
    [
      'one byte cut',
      (path) => writeFileSync(path, readFileSync(path).subarray(1)),
    ],
  ])(
    'removes an object with %s, says so and answers false',
    async (_case, damage) => {
      const { cache, release, logger } = await storedRelease();
      damage(join(cacheDir, 'artifacts', `${release.artifact.sha256}.tgz`));

      expect(await cache.checkArtifact(release.artifact)).toBe(false);
      expect(filesIn(join(cacheDir, 'artifacts'))).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        `Cached artifact sha256 ${release.artifact.sha256.slice(0, 12)} failed its check and was removed`,
      );
    },
  );
});

describe('extractArtifact', () => {
  it('extracts into the folder and answers its flow.mjs', async () => {
    const { cache, release } = await storedRelease();
    const into = join(root, 'instance', 'releases', '17');

    const flowFile = await cache.extractArtifact(release.artifact, into);

    expect(flowFile).toBe(join(into, 'flow.mjs'));
    expect(readFileSync(flowFile, 'utf8')).toContain('export default');
  });

  it('refuses a flipped object, removes it and extracts nothing', async () => {
    const { cache, release, logger } = await storedRelease();
    flipOneByte(join(cacheDir, 'artifacts', `${release.artifact.sha256}.tgz`));
    const into = join(root, 'instance', 'releases', '17');

    const refusal = await refusalOf(
      cache.extractArtifact(release.artifact, into),
    );

    expect(refusal.check).toBe('artifact-sha256');
    expect(existsSync(into)).toBe(false);
    expect(filesIn(join(cacheDir, 'artifacts'))).toEqual([]);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('refuses an object that is not cached', async () => {
    const { cache } = await storedRelease();
    const missing = await buildRelease({ sequence: 18, flowName: 'other' });
    const into = join(root, 'instance', 'releases', '18');

    const refusal = await refusalOf(
      cache.extractArtifact(missing.artifact, into),
    );

    expect(refusal.check).toBe('artifact-bytes');
    expect(existsSync(into)).toBe(false);
  });

  async function cachedArchive(
    archive: Uint8Array,
  ): Promise<{ cache: ReleaseCache; artifact: ReleaseDocument['artifact'] }> {
    const cache = await cacheWith();
    const artifact = { sha256: sha256Hex(archive), bytes: archive.byteLength };
    await cache.storeArtifact(chunksOf(archive), artifact);
    return { cache, artifact };
  }

  describe('within its caps on entries and bytes', () => {
    const caps = { maxEntries: 3, maxBytes: 1000 };

    async function cappedCache(entries: Record<string, string>) {
      const archive = await archiveOf(entries);
      const cache = await createReleaseCache(
        cacheDir,
        createMockLogger(),
        caps,
      );
      const artifact = {
        sha256: sha256Hex(archive),
        bytes: archive.byteLength,
      };
      await cache.storeArtifact(chunksOf(archive), artifact);
      return {
        cache,
        artifact,
        into: join(root, 'instance', 'releases', '17'),
      };
    }

    it.each<[string, Record<string, string>]>([
      [
        'four entries past a cap of three',
        { 'flow.mjs': 'x', 'a.txt': '', 'b.txt': '', 'c.txt': '' },
      ],
      [
        '1200 bytes past a cap of 1000',
        { 'flow.mjs': 'x'.repeat(600), 'b.txt': 'y'.repeat(600) },
      ],
    ])(
      'refuses %s as archive-entry and leaves no folder',
      async (_case, entries) => {
        const { cache, artifact, into } = await cappedCache(entries);

        const refusal = await refusalOf(cache.extractArtifact(artifact, into));

        expect(refusal.check).toBe('archive-entry');
        expect(existsSync(into)).toBe(false);
      },
    );

    it('extracts three entries of 1000 bytes, at both caps', async () => {
      const { cache, artifact, into } = await cappedCache({
        'flow.mjs': 'x'.repeat(500),
        'b.txt': 'y'.repeat(500),
        'c.txt': '',
      });

      expect(await cache.extractArtifact(artifact, into)).toBe(
        join(into, 'flow.mjs'),
      );
    });
  });

  it('refuses an archive without flow.mjs as archive-entry and leaves no folder', async () => {
    const { cache, artifact } = await cachedArchive(
      await archiveOf({ 'index.mjs': 'export default 1' }),
    );
    const into = join(root, 'instance', 'releases', '17');

    const refusal = await refusalOf(cache.extractArtifact(artifact, into));

    expect(refusal.check).toBe('archive-entry');
    expect(existsSync(into)).toBe(false);
  });

  it('refuses an archive whose flow.mjs is a folder', async () => {
    const { cache, artifact } = await cachedArchive(
      await archiveOf({ 'flow.mjs/index.mjs': 'export default 1' }),
    );

    const refusal = await refusalOf(
      cache.extractArtifact(artifact, join(root, 'instance', 'releases', '17')),
    );

    expect(refusal.check).toBe('archive-entry');
  });

  it('never writes an entry with ../ outside the folder', async () => {
    const source = join(root, 'source');
    mkdirSync(join(source, 'inner'), { recursive: true });
    writeFileSync(join(source, 'inner', 'flow.mjs'), 'export default 1');
    writeFileSync(join(source, 'escape.txt'), 'outside');
    const chunks: Buffer[] = [];
    for await (const chunk of tarCreate(
      { gzip: true, cwd: join(source, 'inner'), preservePaths: true },
      ['flow.mjs', '../escape.txt'],
    ))
      chunks.push(Buffer.from(chunk));
    const { cache, artifact } = await cachedArchive(
      new Uint8Array(Buffer.concat(chunks)),
    );
    const releases = join(root, 'instance', 'releases');
    const into = join(releases, '17');

    let check: RefusalCheck | undefined;
    try {
      await cache.extractArtifact(artifact, into);
    } catch (error) {
      if (!(error instanceof ReleaseRefusal)) throw error;
      check = error.check;
    }

    expect(check).toBe('archive-entry');
    expect(filesIn(releases)).toEqual([]);
  });
});
