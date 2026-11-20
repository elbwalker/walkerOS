/**
 * The release cache of `runneros remote`, which instances may share on one
 * volume: content-addressed objects, `documents/<sha256>.json`,
 * `artifacts/<sha256>.tgz` for a server release's archive and
 * `artifacts/<sha256>.js` for a web release's file, and each release's
 * walkerOS secrets as `secrets/<key id>/<sequence>.jwe`. Each object is
 * written under a temporary name in its own folder and renamed, and every
 * load checks it again, so a partial or damaged object is refused, never
 * run.
 *
 * Secret values are held here only sealed, as they arrived from the app: to
 * the encryption key of the runner's credential, which is never here, filed
 * under that key's RFC 7638 thumbprint. A copy of the folder reveals no
 * value, and an instance reads only the sets of its own key. Nothing is
 * pruned.
 */

import { createHash, randomBytes } from 'crypto';
import { constants, createReadStream } from 'fs';
import {
  access,
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  type FileHandle,
} from 'fs/promises';
import { dirname, join } from 'path';
import { x as tarExtract } from 'tar';
import { ChannelError, cappedChunks } from '@walkeros/server-core';
import type { Logger, RefusalCheck, ReleaseDocument } from '@walkeros/core';
import { codeOf, errorCode, messageOf } from './errors.js';
import {
  cachedArtifactRemovedLine,
  cachedDocumentSkippedLine,
  cachedDocumentUnreadLine,
} from './lines.js';
import {
  ARTIFACT_MAX_BYTES,
  DOCUMENT_MAX_BYTES,
  ReleaseRefusal,
  readReleaseDocument,
  sha256Hex,
} from './release-document.js';

/** What an artifact is: a server release's archive or a web release's one file. */
export type ArtifactKind = 'archive' | 'file';

/** A cached release: its document and the sha256 its file in `documents/` is named by. */
export interface CachedRelease {
  sha256: string;
  document: ReleaseDocument;
}

/**
 * Releases newest first, one per sequence: of two at one sequence the lower
 * sha256, so every instance on a shared cache derives the same newest
 * release and the same high-water mark from it.
 */
export function newestFirst<T extends CachedRelease>(
  entries: readonly T[],
): T[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.document.sequence - a.document.sequence ||
      a.sha256.localeCompare(b.sha256),
  );
  return sorted.filter(
    (entry, index) =>
      index === 0 ||
      sorted[index - 1].document.sequence !== entry.document.sequence,
  );
}

export interface ReleaseCache {
  storeDocument(bytes: Uint8Array, sha256: string): Promise<void>;
  /** Every cached document that hashes to its name, reads, and names this deployment. */
  documents(deployment: string): Promise<CachedRelease[]>;
  highWater(
    deployment: string,
  ): Promise<{ sequence: number; sha256: string } | undefined>;
  /**
   * Awaits each FileHandle.write before it reads the next chunk. Its
   * refusals (`artifact-bytes`, `artifact-sha256`) name no sequence: the
   * caller adds its document's.
   */
  storeArtifact(
    chunks: AsyncIterable<Uint8Array>,
    artifact: ReleaseDocument['artifact'],
    kind: ArtifactKind,
  ): Promise<void>;
  /** Re-hashes the cached object; one that fails is removed and false is returned. */
  checkArtifact(
    artifact: ReleaseDocument['artifact'],
    kind: ArtifactKind,
  ): Promise<boolean>;
  /**
   * Checks, then extracts into `into`; resolves with the flow.mjs path. Its
   * refusals (the artifact checks, `archive-entry`) name no sequence: the
   * caller adds its document's. A folder it made is removed on failure.
   */
  extractArtifact(
    artifact: ReleaseDocument['artifact'],
    into: string,
  ): Promise<string>;
  /**
   * Re-checks the cached file, copies it to a temporary name beside
   * `target` and renames it over `target`, so a request in flight finishes
   * on the old file and the rename never crosses file systems; false when
   * the object is missing or failed, with `target` as it was. A target that
   * is a link is replaced itself, never followed.
   */
  placeFile(
    artifact: ReleaseDocument['artifact'],
    target: string,
  ): Promise<boolean>;
  /**
   * Writes a release's sealed set as it arrived, under
   * `secrets/<keyId>/<sequence>.jwe`, by a temporary name and a rename. The
   * key id and the sequence are checked before any path is made, as by
   * each sealed set call.
   */
  storeSealedSet(
    keyId: string,
    sequence: number,
    bytes: Uint8Array,
  ): Promise<void>;
  /**
   * The sealed set under that name: a regular file of at most 1 MiB; else,
   * when nothing or something else is there (a link, a FIFO, a folder, a
   * longer file), undefined. Any other fault of the read throws, the
   * error's code naming it.
   */
  sealedSet(keyId: string, sequence: number): Promise<Uint8Array | undefined>;
  removeSealedSet(keyId: string, sequence: number): Promise<void>;
}

/**
 * What one extraction may write, so an archive within its own size cap
 * cannot fill the instance's folder while the old child serves: the bytes
 * its entries' headers name, at most the bound on an archive itself, and a
 * fixed number of entries. An archive past either is refused as
 * `archive-entry` (the line: `Release v17 refused (archive-entry)`).
 */
export const EXTRACT_MAX_BYTES = ARTIFACT_MAX_BYTES;
export const EXTRACT_MAX_ENTRIES = 100_000;

export interface ExtractLimits {
  maxBytes: number;
  maxEntries: number;
}

/** The largest sealed set a runner reads (the channel's cap for it). */
export const SEALED_SET_MAX_BYTES = 1_048_576;

const SHA256 = /^[0-9a-f]{64}$/;
/** An RFC 7638 thumbprint: a SHA-256 in base64url. */
const KEY_ID = /^[A-Za-z0-9_-]{43}$/;
const DOCUMENT_FILE = /^([0-9a-f]{64})\.json$/;
const FLOW_ENTRY = 'flow.mjs';

/** A cache path is made from a sha256 only, so nothing else reaches it. */
function assertSha256(sha256: string): void {
  if (!SHA256.test(sha256))
    throw new Error('A cache object name is not 64 lowercase hex characters');
}

/** A sealed set's path is made from a key id and a sequence only. */
function assertSealedName(keyId: string, sequence: number): void {
  if (!KEY_ID.test(keyId))
    throw new Error('A sealed set key id is not 43 base64url characters');
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new Error(
      'A sealed set sequence is not a safe integer of at least 1',
    );
}

function temporaryName(path: string): string {
  return `${path}.tmp-${randomBytes(8).toString('hex')}`;
}

/** tar's own refusals and zlib's, as opposed to a failing disk. */
function isArchiveError(error: unknown): boolean {
  const code = errorCode(error);
  return (
    code !== undefined && (code.startsWith('TAR_') || code.startsWith('Z_'))
  );
}

async function writeAll(handle: FileHandle, chunk: Uint8Array): Promise<void> {
  let written = 0;
  while (written < chunk.byteLength) {
    const { bytesWritten } = await handle.write(
      chunk,
      written,
      chunk.byteLength - written,
    );
    written += bytesWritten;
  }
}

async function fileSha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

/**
 * The cache in `dir`, with its two folders made. A folder that cannot be
 * written fails here, before anything serves.
 */
export async function createReleaseCache(
  dir: string,
  logger: Logger.Instance,
  limits: ExtractLimits = {
    maxBytes: EXTRACT_MAX_BYTES,
    maxEntries: EXTRACT_MAX_ENTRIES,
  },
): Promise<ReleaseCache> {
  const documentsDir = join(dir, 'documents');
  const artifactsDir = join(dir, 'artifacts');
  try {
    for (const folder of [documentsDir, artifactsDir]) {
      await mkdir(folder, { recursive: true });
      await access(folder, constants.W_OK);
    }
  } catch (error) {
    throw new Error(
      `The cache folder ${dir} cannot be written: ${messageOf(error)}`,
    );
  }

  const artifactPath = (sha256: string, kind: ArtifactKind): string => {
    assertSha256(sha256);
    return join(
      artifactsDir,
      `${sha256}${kind === 'archive' ? '.tgz' : '.js'}`,
    );
  };

  const sealedPath = (keyId: string, sequence: number): string => {
    assertSealedName(keyId, sequence);
    return join(dir, 'secrets', keyId, `${sequence}.jwe`);
  };

  /** Writes the bytes under a temporary name, then renames them into place. */
  const writeSynced = async (path: string, bytes: Uint8Array) => {
    const temporary = temporaryName(path);
    try {
      // Synced before the rename: after a power loss the name never points
      // to an empty or partial file.
      const handle = await open(temporary, 'wx');
      try {
        await writeAll(handle, bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, path);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  };

  /**
   * The cached object against its document: missing, or the check it fails,
   * or undefined when it holds exactly those bytes.
   */
  const verify = async (
    artifact: ReleaseDocument['artifact'],
    kind: ArtifactKind,
  ): Promise<'missing' | RefusalCheck | undefined> => {
    const path = artifactPath(artifact.sha256, kind);
    try {
      const { size } = await stat(path);
      if (size !== artifact.bytes) return 'artifact-bytes';
      return (await fileSha256(path)) === artifact.sha256
        ? undefined
        : 'artifact-sha256';
    } catch (error) {
      if (errorCode(error) === 'ENOENT') return 'missing';
      throw error;
    }
  };

  /** Checks the object; one that fails is removed, with its line. */
  const recheck = async (
    artifact: ReleaseDocument['artifact'],
    kind: ArtifactKind,
  ): Promise<'missing' | RefusalCheck | undefined> => {
    const failed = await verify(artifact, kind);
    if (failed !== undefined && failed !== 'missing') {
      await rm(artifactPath(artifact.sha256, kind), { force: true });
      logger.error(cachedArtifactRemovedLine(artifact.sha256));
    }
    return failed;
  };

  // The files a skip line was written for: one line per file per process.
  const skipped = new Set<string>();
  const skip = (name: string, line: string): void => {
    if (skipped.has(name)) return;
    skipped.add(name);
    logger.warn(line);
  };

  /**
   * A damaged document, or one this instance cannot read, is skipped with
   * one WARN line and stays on disk: another runner on the volume may read
   * it or a later version. A document of another deployment is skipped with
   * no line, since runners of several deployments may share one cache. Only
   * a folder that cannot be listed throws.
   */
  const documents: ReleaseCache['documents'] = async (deployment) => {
    const found: CachedRelease[] = [];
    for (const name of (await readdir(documentsDir)).sort()) {
      const sha256 = DOCUMENT_FILE.exec(name)?.[1];
      if (sha256 === undefined) continue;
      const path = join(documentsDir, name);
      let bytes: Uint8Array;
      try {
        // Only a regular file is read: a FIFO would wait for a writer
        // forever, and a link may point anywhere.
        const entry = await lstat(path);
        if (!entry.isFile()) {
          skip(name, cachedDocumentSkippedLine(sha256, 'document-format'));
          continue;
        }
        // A file above the channel's cap was never a document read here.
        if (entry.size > DOCUMENT_MAX_BYTES) {
          skip(name, cachedDocumentSkippedLine(sha256, 'document-size'));
          continue;
        }
        bytes = new Uint8Array(await readFile(path));
      } catch (error) {
        // A file gone since the listing is not cached; one this instance
        // cannot read is skipped as a damaged one is, and another instance
        // may read it.
        if (errorCode(error) !== 'ENOENT')
          skip(name, cachedDocumentUnreadLine(sha256, codeOf(error)));
        continue;
      }
      // Bytes that are not the document their name addresses.
      if (sha256Hex(bytes) !== sha256) {
        skip(name, cachedDocumentSkippedLine(sha256, 'document-format'));
        continue;
      }
      try {
        found.push({
          sha256,
          document: readReleaseDocument(bytes, { deployment }).document,
        });
      } catch (error) {
        if (!(error instanceof ReleaseRefusal)) throw error;
        if (error.check !== 'deployment')
          skip(name, cachedDocumentSkippedLine(sha256, error.check));
      }
    }
    return found;
  };

  return {
    async storeDocument(bytes, sha256) {
      assertSha256(sha256);
      if (sha256Hex(bytes) !== sha256)
        throw new Error(
          `The document bytes do not hash to sha256 ${sha256.slice(0, 12)}`,
        );
      await writeSynced(join(documentsDir, `${sha256}.json`), bytes);
    },

    documents,

    async highWater(deployment) {
      const [newest] = newestFirst(await documents(deployment));
      return (
        newest && { sequence: newest.document.sequence, sha256: newest.sha256 }
      );
    },

    async storeArtifact(chunks, artifact, kind) {
      const path = artifactPath(artifact.sha256, kind);
      const temporary = temporaryName(path);
      const handle = await open(temporary, 'wx');
      try {
        const hash = createHash('sha256');
        let total = 0;
        try {
          for await (const chunk of cappedChunks(chunks, artifact.bytes)) {
            hash.update(chunk);
            total += chunk.byteLength;
            await writeAll(handle, chunk);
          }
        } catch (error) {
          if (error instanceof ChannelError && error.failure === 'size')
            throw new ReleaseRefusal('artifact-bytes');
          throw error;
        }
        if (total !== artifact.bytes)
          throw new ReleaseRefusal('artifact-bytes');
        if (hash.digest('hex') !== artifact.sha256)
          throw new ReleaseRefusal('artifact-sha256');
        await handle.close();
        await rename(temporary, path);
      } catch (error) {
        await handle.close().catch(() => undefined);
        await rm(temporary, { force: true });
        throw error;
      }
    },

    async checkArtifact(artifact, kind) {
      return (await recheck(artifact, kind)) === undefined;
    },

    async extractArtifact(artifact, into) {
      const failed = await recheck(artifact, 'archive');
      // An object no longer there holds none of its bytes.
      if (failed === 'missing') throw new ReleaseRefusal('artifact-bytes');
      if (failed !== undefined) throw new ReleaseRefusal(failed);

      const made = await mkdir(into, { recursive: true });
      try {
        try {
          // Counted as tar reads each header: past a cap nothing more is
          // written, and the extraction is refused once tar is done.
          let entries = 0;
          let bytes = 0;
          let past = false;
          await tarExtract({
            file: artifactPath(artifact.sha256, 'archive'),
            cwd: into,
            strict: true,
            filter: (_path, entry) => {
              entries += 1;
              bytes += entry.size;
              if (entries > limits.maxEntries || bytes > limits.maxBytes)
                past = true;
              return !past;
            },
          });
          if (past) throw new ReleaseRefusal('archive-entry');
        } catch (error) {
          if (isArchiveError(error)) throw new ReleaseRefusal('archive-entry');
          throw error;
        }
        const flowFile = join(into, FLOW_ENTRY);
        const entry = await lstat(flowFile).catch(() => undefined);
        if (!entry?.isFile()) throw new ReleaseRefusal('archive-entry');
        return flowFile;
      } catch (error) {
        // Remove what this call extracted; a folder it did not make stays.
        if (made !== undefined)
          await rm(into, { recursive: true, force: true });
        throw error;
      }
    },

    async placeFile(artifact, target) {
      if ((await recheck(artifact, 'file')) !== undefined) return false;
      // In the target's own folder: a rename there is atomic.
      const temporary = temporaryName(target);
      try {
        await copyFile(
          artifactPath(artifact.sha256, 'file'),
          temporary,
          constants.COPYFILE_EXCL,
        );
        await rename(temporary, target);
      } catch (error) {
        await rm(temporary, { force: true });
        throw error;
      }
      return true;
    },

    async storeSealedSet(keyId, sequence, bytes) {
      const path = sealedPath(keyId, sequence);
      await mkdir(dirname(path), { recursive: true });
      await writeSynced(path, bytes);
    },

    async sealedSet(keyId, sequence) {
      const path = sealedPath(keyId, sequence);
      let handle: FileHandle;
      try {
        // Never through a link, and a FIFO opens without waiting for a writer.
        handle = await open(
          path,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
        );
      } catch (error) {
        const code = errorCode(error);
        if (code === 'ENOENT' || code === 'ELOOP' || code === 'ENOTDIR')
          return undefined;
        throw error;
      }
      try {
        const entry = await handle.stat();
        if (!entry.isFile() || entry.size > SEALED_SET_MAX_BYTES)
          return undefined;
        const bytes = new Uint8Array(await handle.readFile());
        return bytes.byteLength > SEALED_SET_MAX_BYTES ? undefined : bytes;
      } finally {
        await handle.close();
      }
    },

    async removeSealedSet(keyId, sequence) {
      await rm(sealedPath(keyId, sequence), { force: true });
    },
  };
}
