/**
 * The web parts a server release serves. A server release lists each web
 * part it serves: its web deployment, the path of its file in the release's
 * folder, and the web sequence whose file the release's archive holds
 * there. Paths are facts of the server release, bytes are facts of the web
 * part: each web part's current release is the newest cached release of its
 * deployment whose file checks, and the cache is the record of it, since a
 * web document enters the cache only after its file passed.
 *
 * Every placement puts the current web release at a listed path only when
 * it is at or above the entry's sequence, so an older cached file never
 * replaces the newer copy the archive holds. A file is placed by a copy to
 * a temporary name beside it and a rename, so a request in flight finishes
 * on the old file, and a web release never restarts the child.
 *
 * A served path becomes a file path only here, after core's path rule
 * passed it, and never through a link.
 */

import type { Stats } from 'fs';
import { lstat, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  isServedPath,
  type CheckInAnswer,
  type Logger,
  type RemoteLast,
  type RemoteState,
  type ReleaseDocument,
  type ServedDeployment,
} from '@walkeros/core';
import { servedReleaseUrl } from '../api-paths.js';
import {
  newestFirst,
  type ArtifactKind,
  type CachedRelease,
  type ReleaseCache,
} from './cache.js';
import { codeOf, errorCode } from './errors.js';
import {
  servedNotFetchedLine,
  servedNotPlacedLine,
  servedPlacedLine,
  servedRefusedByLine,
  servedRefusedLine,
  type RefusingSide,
  type ServedFileFacts,
} from './lines.js';
import { ReleaseRefusal } from './release-document.js';

/** The entry at `path` itself, never followed; undefined when nothing is there. */
async function entryAt(path: string): Promise<Stats | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return undefined;
    throw error;
  }
}

/**
 * Where a served path lands in a release folder. Each folder of the path is
 * an existing real directory, or made with one `mkdir`; a link, a file or
 * anything else there is `archive-entry`, and nothing is made through it. A
 * target that is a directory is `archive-entry`; a target that is a link is
 * answered, since the placement renames over the link itself. Its refusal
 * names no sequence: the caller adds its document's. Any other fault of the
 * walk (an `lstat` other than a missing entry, a `mkdir` that fails) throws
 * as it came, its code naming it. It walks one path of a folder at a time:
 * two walks that share a missing parent would race on its `mkdir`.
 */
export async function servedTarget(
  folder: string,
  path: string,
): Promise<string> {
  if (!isServedPath(path)) throw new ReleaseRefusal('archive-entry');
  const parts = path.split('/');
  let at = folder;
  for (const part of parts.slice(0, -1)) {
    at = join(at, part);
    const entry = await entryAt(at);
    if (entry === undefined) await mkdir(at);
    else if (!entry.isDirectory()) throw new ReleaseRefusal('archive-entry');
  }
  const target = join(at, parts[parts.length - 1]);
  if ((await entryAt(target))?.isDirectory())
    throw new ReleaseRefusal('archive-entry');
  return target;
}

/** A failed request as its line names it: the side that refused it with the status, else the failure or the status. */
export type RequestFailure =
  | { side: RefusingSide; status: number }
  | { reason: string };

/** What the supervisor's one document fetch came to. */
export type DocumentFetch =
  | { got: 'document'; release: CachedRelease; bytes?: Uint8Array }
  | { got: 'refused'; refusal: ReleaseRefusal }
  | { got: 'failed'; failure: RequestFailure }
  /** The release route serves no document (404). */
  | { got: 'none' }
  /** A 304 for a cached document gone since. */
  | { got: 'gone' };

/** What the supervisor's one artifact fetch came to. */
export type ArtifactFetch =
  | { got: 'stored' }
  | { got: 'refused'; refusal: ReleaseRefusal }
  | { got: 'failed'; failure: RequestFailure }
  /** A fault of this instance's disk. */
  | { got: 'fault'; error: unknown };

export interface ServedDeps {
  cache: ReleaseCache;
  logger: Logger.Instance;
  /** The app's origin, which the release route naming a web deployment is on. */
  origin: string;
  /**
   * The supervisor's one document fetch: a conditional GET with the part's
   * high-water ETag, read against that part's deployment and mark.
   */
  fetchDocument(part: {
    deployment: string;
    url: string;
  }): Promise<DocumentFetch>;
  /** The supervisor's one artifact fetch: checked in the cache, else fetched by the document's release and stored. */
  fetchArtifact(
    release: CachedRelease,
    kind: ArtifactKind,
  ): Promise<ArtifactFetch>;
}

/** Where a placement writes: a fresh extraction, or the folder a child serves from. */
export type PlacementInto = 'extraction' | 'running';

/**
 * A web deployment's current release as one lookup found it: the release,
 * none, or a cache fault (with the sequence of the release whose check
 * faulted, when one was reached).
 */
export type WebCurrent =
  | { release: CachedRelease | undefined }
  | { fault: string; sequence?: number };

/** The lookups of one fetch step, per web deployment, for the placement that follows it. */
export type WebCurrents = ReadonlyMap<string, WebCurrent>;

export interface ServedFiles {
  /**
   * Fetches each listed web part whose sequence `answer` names above its
   * newest cached release, once per answer: its document through the
   * release route naming the web deployment, then its file by the
   * document's release, the document cached only once the file passed. A
   * failed fetch or a cache fault is one line per change of state per web
   * deployment and marks nothing; a refusal marks the refused sequence,
   * which is not fetched again. Answers each web part's current release as
   * it looked it up, for the placement that follows.
   */
  fetchNamed(
    served: readonly ServedDeployment[],
    answer: CheckInAnswer,
  ): Promise<WebCurrents>;
  /**
   * Places each listed path's current web release into `folder`, the folder
   * of `document`'s release, where it is at or above the entry's sequence
   * and newer than what serves there, one path at a time; `currents` are
   * the fetch step's lookups, so a check-in reads each web part once. The
   * caller holds the folder's lock. At an extraction the walk runs for
   * every listed path, and its refusal throws `archive-entry` naming no
   * sequence, since the archive's own layout refuses the release; into a
   * running folder a refused walk is one line and marks nothing, since the
   * flow may have changed its own folder. A cache fault, or a fault of the
   * walk, the copy or the rename, is one line with its code, and the copy
   * there stays.
   */
  place(
    document: ReleaseDocument,
    folder: string,
    into: PlacementInto,
    currents?: WebCurrents,
  ): Promise<void>;
  /** `remote.served` of a running release; undefined when it lists no web part. */
  report(document: ReleaseDocument): Record<string, RemoteState> | undefined;
  /** The folder of a release is removed: what served there is forgotten. */
  forget(sequence: number): void;
}

/** What serves at a listed path of one folder. */
interface Placed {
  sequence: number;
  /** The placed file's sha256; none while the archive's own copy serves. */
  sha256?: string;
}

export function createServedFiles(deps: ServedDeps): ServedFiles {
  const { cache, logger } = deps;
  /** Per web deployment, in memory: the sequences refused here. */
  const refused = new Map<string, Set<number>>();
  /** Per web deployment: the newest web release refused here and not superseded. */
  const last = new Map<string, RemoteLast>();
  /** Per web deployment: its last failure line, one per change of state, apart from the server's. */
  const failing = new Map<string, string>();
  /** Per web deployment: the answer its last fetch was for, so each answer tries a web part once. */
  const tried = new Map<string, CheckInAnswer>();
  /**
   * Per web deployment: the document whose file last checked. Its file is
   * hashed again only once a newer document is cached; a placement's copy
   * checks it again either way.
   */
  const verified = new Map<string, string>();
  /** Per release folder, by its sequence, and per web deployment: what serves there. */
  const placed = new Map<number, Map<string, Placed>>();

  function fail(deployment: string, line: string): void {
    if (failing.get(deployment) === line) return;
    failing.set(deployment, line);
    logger.error(line);
  }

  function isRefused(deployment: string, sequence: number): boolean {
    return refused.get(deployment)?.has(sequence) ?? false;
  }

  /**
   * Marks the refused web release: its own sequence when its document read,
   * else the sequence the answer named. Its line and `last` come once, when
   * it is newly marked.
   */
  function refuse(
    entry: ServedDeployment,
    named: number,
    refusal: ReleaseRefusal,
  ): void {
    const { deployment, path } = entry;
    const sequence = refusal.sequence ?? named;
    if (isRefused(deployment, sequence)) return;
    refused.set(
      deployment,
      (refused.get(deployment) ?? new Set<number>()).add(sequence),
    );
    const held = last.get(deployment);
    if (!held || sequence >= held.sequence)
      last.set(deployment, {
        sequence,
        state: 'refused',
        check: refusal.check,
      });
    logger.error(servedRefusedLine({ path, sequence }, refusal.check));
  }

  function failed(
    entry: ServedDeployment,
    sequence: number,
    failure: RequestFailure,
  ): void {
    const file = { path: entry.path, sequence };
    fail(
      entry.deployment,
      'side' in failure
        ? servedRefusedByLine(file, failure.side, failure.status)
        : servedNotFetchedLine(file, failure.reason),
    );
  }

  /**
   * The web deployment's current release: its newest cached release whose
   * file checks. A cache fault is answered, never thrown: a web part never
   * stops its server release.
   */
  async function currentOf(deployment: string): Promise<WebCurrent> {
    let cached: CachedRelease[];
    try {
      cached = newestFirst(await cache.documents(deployment));
    } catch (error) {
      return { fault: codeOf(error) };
    }
    for (const release of cached) {
      if (verified.get(deployment) === release.sha256) return { release };
      const { sequence } = release.document;
      try {
        if (await cache.checkArtifact(release.document.artifact, 'file')) {
          verified.set(deployment, release.sha256);
          return { release };
        }
      } catch (error) {
        return { fault: codeOf(error), sequence };
      }
    }
    verified.delete(deployment);
    return { release: undefined };
  }

  /**
   * One web part's named release: its document, then its file. Answers the
   * release once it is the current one.
   */
  async function fetchOne(
    entry: ServedDeployment,
    named: number,
  ): Promise<CachedRelease | undefined> {
    const { deployment, path } = entry;
    const got = await deps.fetchDocument({
      deployment,
      url: servedReleaseUrl(deps.origin, deployment),
    });
    if (got.got === 'none' || got.got === 'gone') {
      // A 304 for a document gone from the cache since: the next check-in
      // asks without it.
      failed(entry, named, { reason: got.got === 'none' ? '404' : '304' });
      return undefined;
    }
    if (got.got === 'failed') {
      failed(entry, named, got.failure);
      return undefined;
    }
    if (got.got === 'refused') {
      refuse(entry, named, got.refusal);
      return undefined;
    }
    const { release, bytes } = got;
    const { sequence } = release.document;
    // Refused here before: its line was written then.
    if (isRefused(deployment, sequence)) return undefined;
    const file = await deps.fetchArtifact(release, 'file');
    if (file.got === 'failed') {
      failed(entry, sequence, file.failure);
      return undefined;
    }
    if (file.got === 'refused') {
      refuse(entry, named, new ReleaseRefusal(file.refusal.check, sequence));
      return undefined;
    }
    const facts = { path, sequence };
    if (file.got === 'fault') {
      fail(
        deployment,
        servedNotPlacedLine(facts, { code: codeOf(file.error) }),
      );
      return undefined;
    }
    // The document is the record of the current web release: it enters the
    // cache only now, after its file passed.
    if (bytes)
      try {
        await cache.storeDocument(bytes, release.sha256);
      } catch (error) {
        fail(deployment, servedNotPlacedLine(facts, { code: codeOf(error) }));
        return undefined;
      }
    verified.set(deployment, release.sha256);
    failing.delete(deployment);
    return release;
  }

  /** One listed web part the answer names: looked up, fetched when named above what is cached. */
  async function fetchFor(
    entry: ServedDeployment,
    named: number,
    answer: CheckInAnswer,
  ): Promise<WebCurrent | undefined> {
    const { deployment, path } = entry;
    if (tried.get(deployment) === answer || isRefused(deployment, named))
      return undefined;
    const current = await currentOf(deployment);
    if ('fault' in current) {
      fail(
        deployment,
        servedNotFetchedLine({ path, sequence: named }, current.fault),
      );
      return current;
    }
    if (current.release && named <= current.release.document.sequence)
      return current;
    tried.set(deployment, answer);
    const fetched = await fetchOne(entry, named);
    return fetched ? { release: fetched } : current;
  }

  /**
   * Whether the current web release replaces what serves at a path: never
   * below the entry's sequence, so an older cache never overwrites the
   * archive's newer copy; at or above it the archive's own copy gives way,
   * and a placed file only to a newer one.
   */
  function replaces(
    sequence: number,
    entry: ServedDeployment,
    serving: Placed,
  ): boolean {
    if (sequence < entry.sequence) return false;
    return serving.sha256 === undefined || sequence > serving.sequence;
  }

  /**
   * The walk of one listed path: its target, or the fault's code. A refusal
   * throws: at an extraction it is the release's own layout.
   */
  async function walk(
    folder: string,
    entry: ServedDeployment,
  ): Promise<string | { code: string }> {
    try {
      return await servedTarget(folder, entry.path);
    } catch (error) {
      if (error instanceof ReleaseRefusal) throw error;
      return { code: codeOf(error) };
    }
  }

  /** The walk into a running folder, where a refusal is one line too. */
  async function runningWalk(
    folder: string,
    entry: ServedDeployment,
    facts: ServedFileFacts,
  ): Promise<string | { code: string } | undefined> {
    try {
      return await walk(folder, entry);
    } catch (error) {
      if (!(error instanceof ReleaseRefusal)) throw error;
      fail(
        entry.deployment,
        servedNotPlacedLine(facts, { check: error.check }),
      );
      return undefined;
    }
  }

  async function place(
    document: ReleaseDocument,
    folder: string,
    into: PlacementInto,
    currents?: WebCurrents,
  ): Promise<void> {
    const running = into === 'running';
    const files =
      (running ? placed.get(document.sequence) : undefined) ??
      new Map<string, Placed>();
    placed.set(document.sequence, files);
    // One path at a time: two walks that share a missing parent would race
    // on its mkdir.
    for (const entry of document.served ?? []) {
      const { deployment, path } = entry;
      // At an extraction the walk runs for every listed path, so a layout
      // that refuses one is found before any child forks.
      const fresh = running ? undefined : await walk(folder, entry);
      const serving = files.get(deployment) ?? { sequence: entry.sequence };
      files.set(deployment, serving);
      const looked = currents?.get(deployment);
      const lookup = looked ?? (await currentOf(deployment));
      if ('fault' in lookup) {
        // The fetch step wrote its line when it met the fault.
        if (!looked)
          fail(
            deployment,
            servedNotPlacedLine(
              { path, sequence: lookup.sequence },
              { code: lookup.fault },
            ),
          );
        continue;
      }
      const current = lookup.release;
      if (!current || !replaces(current.document.sequence, entry, serving))
        continue;
      const { artifact, sequence } = current.document;
      const facts = { path, sequence };
      const target = fresh ?? (await runningWalk(folder, entry, facts));
      if (target === undefined) continue;
      if (typeof target !== 'string') {
        fail(deployment, servedNotPlacedLine(facts, target));
        continue;
      }
      let done: boolean;
      try {
        done = await cache.placeFile(artifact, target);
      } catch (error) {
        // The copy there stays: the archive's own, or the one placed before.
        fail(deployment, servedNotPlacedLine(facts, { code: codeOf(error) }));
        continue;
      }
      if (!done) {
        verified.delete(deployment);
        fail(deployment, servedNotPlacedLine(facts, 'not-cached'));
        continue;
      }
      files.set(deployment, { sequence, sha256: artifact.sha256 });
      failing.delete(deployment);
      // A newer web release supersedes a refusal, as the server's does.
      const refusedLast = last.get(deployment);
      if (refusedLast && refusedLast.sequence <= sequence)
        last.delete(deployment);
      logger.info(
        servedPlacedLine(
          facts,
          artifact.sha256,
          running ? serving.sequence : undefined,
        ),
      );
    }
  }

  return {
    async fetchNamed(served, answer) {
      // Its own enumerable entries only: `__proto__` or `toString` pass the
      // id check, and a name the answer does not hold reads its prototype.
      const sequences = new Map(Object.entries(answer.served));
      const currents = new Map<string, WebCurrent>();
      for (const entry of served) {
        const { deployment, path } = entry;
        const named = sequences.get(deployment);
        if (named === undefined) continue;
        try {
          const current = await fetchFor(entry, named, answer);
          if (current) currents.set(deployment, current);
        } catch (error) {
          // A cache fault inside the fetch: the copy there stays.
          const code = codeOf(error);
          fail(
            deployment,
            servedNotFetchedLine({ path, sequence: named }, code),
          );
          currents.set(deployment, { fault: code });
        }
      }
      return currents;
    },

    place,

    report(document) {
      const { served } = document;
      if (!served) return undefined;
      const files = placed.get(document.sequence);
      const states = new Map<string, RemoteState>();
      for (const { deployment, sequence } of served)
        states.set(deployment, {
          running: files?.get(deployment)?.sequence ?? sequence,
          last: last.get(deployment) ?? null,
        });
      // Each key an own property, never assigned: `report['__proto__'] = ...`
      // would set the prototype, not report the web part.
      return Object.fromEntries(states);
    },

    forget(sequence) {
      placed.delete(sequence);
    },
  };
}
