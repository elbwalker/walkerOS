/**
 * The release cache of `runneros remote`: content-addressed objects only,
 * `documents/<sha256>.json` and `artifacts/<sha256>.tgz`, which instances may
 * share on one volume. Each object is written under a temporary name in its
 * own folder and renamed, and every load checks it again, so a partial or
 * damaged object is refused, never run. No secret value is ever written here.
 * Nothing is pruned.
 */

import { createHash, randomBytes } from 'crypto';
import { constants, createReadStream } from 'fs';
import {
  access,
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
import { join } from 'path';
import { x as tarExtract } from 'tar';
import { ChannelError, cappedChunks } from '@walkeros/server-core';
import type { Logger, RefusalCheck, ReleaseDocument } from '@walkeros/core';
import { errorCode, messageOf } from './errors.js';
import {
  cachedArtifactRemovedLine,
  cachedDocumentSkippedLine,
} from './lines.js';
import {
  ARTIFACT_MAX_BYTES,
  DOCUMENT_MAX_BYTES,
  ReleaseRefusal,
  readReleaseDocument,
  sha256Hex,
} from './release-document.js';

export interface ReleaseCache {
  storeDocument(bytes: Uint8Array, sha256: string): Promise<void>;
  /** Every cached document that hashes to its name, reads, and names this deployment. */
  documents(
    deployment: string,
  ): Promise<Array<{ sha256: string; document: ReleaseDocument }>>;
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
  ): Promise<void>;
  /** Re-hashes the cached object; one that fails is removed and false is returned. */
  checkArtifact(artifact: ReleaseDocument['artifact']): Promise<boolean>;
  /**
   * Checks, then extracts into `into`; resolves with the flow.mjs path. Its
   * refusals (the artifact checks, `archive-entry`) name no sequence: the
   * caller adds its document's. A folder it made is removed on failure.
   */
  extractArtifact(
    artifact: ReleaseDocument['artifact'],
    into: string,
  ): Promise<string>;
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

const SHA256 = /^[0-9a-f]{64}$/;
const DOCUMENT_FILE = /^([0-9a-f]{64})\.json$/;
const FLOW_ENTRY = 'flow.mjs';

/** A cache path is made from a sha256 only, so nothing else reaches it. */
function assertSha256(sha256: string): void {
  if (!SHA256.test(sha256))
    throw new Error('A cache object name is not 64 lowercase hex characters');
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

  const artifactPath = (sha256: string): string => {
    assertSha256(sha256);
    return join(artifactsDir, `${sha256}.tgz`);
  };

  /** Writes the bytes under a temporary name, then renames them into place. */
  const placeDocument = async (path: string, bytes: Uint8Array) => {
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
  ): Promise<'missing' | RefusalCheck | undefined> => {
    const path = artifactPath(artifact.sha256);
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
  ): Promise<'missing' | RefusalCheck | undefined> => {
    const failed = await verify(artifact);
    if (failed !== undefined && failed !== 'missing') {
      await rm(artifactPath(artifact.sha256), { force: true });
      logger.error(cachedArtifactRemovedLine(artifact.sha256));
    }
    return failed;
  };

  // The files a skip line was written for: one line per file per process.
  const skipped = new Set<string>();
  const skip = (name: string, sha256: string, check: RefusalCheck): void => {
    if (skipped.has(name)) return;
    skipped.add(name);
    logger.warn(cachedDocumentSkippedLine(sha256, check));
  };

  /**
   * A damaged or unreadable document is skipped with one WARN line and stays
   * on disk: another runner on the volume may read a later version. A
   * document of another deployment is skipped with no line, since runners of
   * several deployments may share one cache.
   */
  const documents: ReleaseCache['documents'] = async (deployment) => {
    const found: Array<{ sha256: string; document: ReleaseDocument }> = [];
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
          skip(name, sha256, 'document-format');
          continue;
        }
        // A file above the channel's cap was never a document read here.
        if (entry.size > DOCUMENT_MAX_BYTES) {
          skip(name, sha256, 'document-size');
          continue;
        }
        bytes = new Uint8Array(await readFile(path));
      } catch (error) {
        // A file gone since the listing is not cached.
        if (errorCode(error) === 'ENOENT') continue;
        throw error;
      }
      // Bytes that are not the document their name addresses.
      if (sha256Hex(bytes) !== sha256) {
        skip(name, sha256, 'document-format');
        continue;
      }
      try {
        found.push({
          sha256,
          document: readReleaseDocument(bytes, { deployment }).document,
        });
      } catch (error) {
        if (!(error instanceof ReleaseRefusal)) throw error;
        if (error.check !== 'deployment') skip(name, sha256, error.check);
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
      await placeDocument(join(documentsDir, `${sha256}.json`), bytes);
    },

    documents,

    async highWater(deployment) {
      // The highest sequence; at one sequence the lowest sha256, so every
      // instance on a shared cache derives the same mark.
      let mark: { sequence: number; sha256: string } | undefined;
      for (const { sha256, document } of await documents(deployment))
        if (
          !mark ||
          document.sequence > mark.sequence ||
          (document.sequence === mark.sequence && sha256 < mark.sha256)
        )
          mark = { sequence: document.sequence, sha256 };
      return mark;
    },

    async storeArtifact(chunks, artifact) {
      const path = artifactPath(artifact.sha256);
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

    async checkArtifact(artifact) {
      return (await recheck(artifact)) === undefined;
    },

    async extractArtifact(artifact, into) {
      const failed = await recheck(artifact);
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
            file: artifactPath(artifact.sha256),
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
  };
}
