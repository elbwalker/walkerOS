/**
 * Atomic cache writes.
 *
 * A cache entry is written to a `.tmp-<rand>` sibling first and renamed into
 * place only when complete, so a write cut short (a full disk, a crash) never
 * leaves a valid-looking entry behind. Directory entries carry a completion
 * marker written LAST; an entry without it (written before this module, or
 * poisoned) is a miss and is replaced by the next write.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import type { Logger } from '@walkeros/core';
import { getErrorMessage } from './utils.js';

/** Marker file inside a complete cache directory entry. */
export const CACHE_COMPLETE_MARKER = '.walkeros-complete';

const TMP_INFIX = '.tmp-';
const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const TMP_NAME = /\.tmp-[0-9a-z]{8}$/;

/** Copies a directory tree; `fs.copy` in production, injectable for tests. */
export type CopyDir = (src: string, dest: string) => Promise<void>;

export interface WriteCacheDirOptions {
  /** Names the entry in the warning, e.g. `name@version`. */
  label?: string;
  copy?: CopyDir;
}

function tempSibling(dest: string): string {
  const rand = Array.from(
    crypto.randomBytes(8),
    (byte) => BASE36[byte % BASE36.length],
  ).join('');
  return `${dest}${TMP_INFIX}${rand}`;
}

function errorCode(error: unknown): string | undefined {
  // Not `instanceof Error`: fs errors can come from another realm.
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function isOccupied(error: unknown): boolean {
  const code = errorCode(error);
  return code === 'EEXIST' || code === 'ENOTEMPTY';
}

/** True for a `.tmp-*` name this module writes before a rename. */
export function isCacheTempName(name: string): boolean {
  return TMP_NAME.test(name);
}

/** True when `dir` holds a completed cache entry (its marker exists). */
export async function isCacheDirComplete(dir: string): Promise<boolean> {
  return fs.pathExists(path.join(dir, CACHE_COMPLETE_MARKER));
}

/** Copy a cache entry out of the cache, without its completion marker. */
export async function readCacheDir(src: string, dest: string): Promise<void> {
  const marker = path.join(src, CACHE_COMPLETE_MARKER);
  await fs.copy(src, dest, { filter: (file) => file !== marker });
}

/**
 * Remove `.tmp-*` leftovers in `dir` older than `maxAgeMs`. Fresh ones may
 * belong to a write in flight and are kept. Never throws.
 */
export async function sweepStaleCacheTemps(
  dir: string,
  maxAgeMs = 3_600_000,
): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  const cutoff = Date.now() - maxAgeMs;
  await Promise.all(
    entries.filter(isCacheTempName).map(async (entry) => {
      const entryPath = path.join(dir, entry);
      try {
        const stats = await fs.stat(entryPath);
        if (stats.mtimeMs < cutoff) await fs.remove(entryPath);
      } catch {
        // Removed concurrently, or unreadable: the next sweep retries.
      }
    }),
  );
}

/**
 * Move `tmp` into place at an occupied `dest` whose entry is NOT complete.
 * The old entry is moved aside atomically first, so a complete entry that a
 * concurrent writer renamed in meanwhile is put back instead of deleted.
 */
async function replaceIncomplete(tmp: string, dest: string): Promise<void> {
  const aside = tempSibling(dest);
  let moved = false;
  try {
    await fs.rename(dest, aside);
    moved = true;
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') throw error;
  }
  const restore = moved && (await isCacheDirComplete(aside));
  const winner = restore ? aside : tmp;
  const loser = restore ? tmp : aside;
  try {
    await fs.rename(winner, dest);
  } catch (error) {
    // A concurrent writer finished first: its entry stands, ours is a copy.
    if (!isOccupied(error) || !(await isCacheDirComplete(dest))) {
      if (!restore && moved) await fs.remove(aside);
      throw error;
    }
    await fs.remove(winner);
  }
  await fs.remove(loser);
}

/**
 * Copy `src` into the cache at `dest` atomically. Never throws: the build
 * already has its own copy, so a failed cache write only warns.
 */
export async function writeCacheDir(
  src: string,
  dest: string,
  logger: Logger.Instance,
  options: WriteCacheDirOptions = {},
): Promise<void> {
  const copy: CopyDir = options.copy ?? ((from, to) => fs.copy(from, to));
  const dir = path.dirname(dest);
  const tmp = tempSibling(dest);
  try {
    await fs.ensureDir(dir);
    await sweepStaleCacheTemps(dir);
    await copy(src, tmp);
    await fs.writeFile(path.join(tmp, CACHE_COMPLETE_MARKER), '');
    try {
      await fs.rename(tmp, dest);
    } catch (error) {
      if (!isOccupied(error)) throw error;
      if (await isCacheDirComplete(dest)) {
        await fs.remove(tmp);
        return;
      }
      await replaceIncomplete(tmp, dest);
    }
  } catch (error) {
    await fs.remove(tmp).catch(() => {});
    const label = options.label ?? path.basename(dest);
    logger.warn(
      `Package cache write failed for ${label}: ${getErrorMessage(error)}. The build continues without caching it.`,
    );
  }
}

/**
 * Write a single cache file atomically: a temp sibling, then a rename, so a
 * reader sees the old file, the new file, or none, never a partial one.
 */
export async function writeCacheFile(
  dest: string,
  content: string,
): Promise<void> {
  const dir = path.dirname(dest);
  const tmp = tempSibling(dest);
  await fs.ensureDir(dir);
  await sweepStaleCacheTemps(dir);
  try {
    await fs.writeFile(tmp, content, 'utf-8');
    await fs.rename(tmp, dest);
  } catch (error) {
    await fs.remove(tmp).catch(() => {});
    throw error;
  }
}
