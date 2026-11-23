/**
 * The lines `runneros remote` writes about its releases, its check-in and its
 * cache. They are the customer's revision trail, so each is built here once.
 *
 * Every line passes the redactor unchanged: a release is `v17`, an artifact
 * `sha256` and 12 hex (the redactor masks runs of 20 or more characters), and
 * a check sits in parentheses, since `refused: artifact-sha256` would read as
 * a key and its value.
 */

import type { RefusalCheck } from '@walkeros/core';

export function releaseLabel(sequence: number): string {
  return `v${sequence}`;
}

export function shortSha(sha256: string): string {
  return `sha256 ${sha256.slice(0, 12)}`;
}

/** A delay as a line shows it: seconds below two minutes, else minutes. */
function delayText(ms: number): string {
  return ms < 120_000
    ? `${Math.ceil(ms / 1000)} s`
    : `${Math.round(ms / 60_000)} min`;
}

/** How a child process ended, as Node's `exit` event gives it. */
export interface ChildExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

function exitText({ code, signal }: ChildExit): string {
  return signal ? `signal ${signal}` : `code ${code}`;
}

export interface ReleaseFacts {
  sequence: number;
  sha256: string;
  flowName: string;
}

function factsText({ sha256, flowName }: ReleaseFacts): string {
  return `${shortSha(sha256)}, flow ${flowName}`;
}

export type HeapFacts =
  | { heapMb: number; from: 'flag' }
  | {
      heapMb: number;
      from: 'granted';
      grantedMb: number;
      supervisorMb: number;
    };

export function heapLine(heap: HeapFacts): string {
  return heap.from === 'flag'
    ? `Heap ${heap.heapMb} MB for the flow, from --heap`
    : `Heap ${heap.heapMb} MB for the flow: three quarters of ${heap.grantedMb} MB granted, less ${heap.supervisorMb} MB for the supervisor`;
}

export function releaseStartingLine(release: ReleaseFacts): string {
  return `Release ${releaseLabel(release.sequence)} starting (${factsText(release)})`;
}

/** `was` is the sequence this one replaces; none at the first. */
export function releaseRunningLine(
  release: ReleaseFacts,
  was?: number,
): string {
  const replaced = was === undefined ? '' : `, was ${releaseLabel(was)}`;
  return `Release ${releaseLabel(release.sequence)} running (${factsText(release)}${replaced})`;
}

/**
 * A refusal by a check; the secret checks name the variables, never values.
 * `fact` says why a check refused when its name alone does not, as the
 * opener of a sealed set says it; it quotes no value.
 */
export function releaseRefusedLine(refusal: {
  check: RefusalCheck;
  sequence?: number;
  names?: readonly string[];
  fact?: string;
}): string {
  const subject =
    refusal.sequence === undefined
      ? 'Release document'
      : `Release ${releaseLabel(refusal.sequence)}`;
  const detail =
    refusal.names && refusal.names.length > 0
      ? `: ${refusal.names.join(', ')}`
      : refusal.fact === undefined
        ? ''
        : `: ${refusal.fact}`;
  return `${subject} refused (${refusal.check}${detail})`;
}

export function notReadyLine(sequence: number, deadlineMs: number): string {
  return `Release ${releaseLabel(sequence)} not ready within ${delayText(deadlineMs)}, refused on this instance`;
}

export function exitedBeforeReadyLine(
  sequence: number,
  exit: ChildExit,
): string {
  return `Release ${releaseLabel(sequence)} exited before it was ready (${exitText(exit)}), refused on this instance`;
}

export function startingAgainLine(sequence: number): string {
  return `Release ${releaseLabel(sequence)} starting again`;
}

export function skippedLine(sequence: number): string {
  return `Release ${releaseLabel(sequence)} skipped (the app does not serve its walkerOS secrets)`;
}

/** A cached release whose archive is not in the cache: a cold boot or a fallback asks the app nothing for it. */
export function archiveNotCachedLine(sequence: number): string {
  return `Release ${releaseLabel(sequence)} skipped (its archive is not in the cache)`;
}

export function crashLine(
  sequence: number,
  exit: ChildExit,
  delayMs: number,
): string {
  return `Release ${releaseLabel(sequence)} exited (${exitText(exit)}), starting it again in ${delayText(delayMs)}`;
}

export type NoReleaseReason =
  | { reason: 'secrets-changed'; sequence: number }
  | { reason: 'no-good-release' }
  | { reason: 'secrets-need-app'; sequence: number };

function noReleaseText(why: NoReleaseReason): string {
  switch (why.reason) {
    case 'secrets-changed':
      return `${releaseLabel(why.sequence)} changed secret values and did not start`;
    case 'secrets-need-app':
      return `the walkerOS secrets of ${releaseLabel(why.sequence)} need the app`;
    case 'no-good-release':
      return 'no good release in the cache';
  }
}

export function noReleaseCanRunLine(why: NoReleaseReason): string {
  return `No release can run: ${noReleaseText(why)}; /ready answers 503`;
}

/** An empty cache at boot: the app named no release, or did not answer. */
export function noReleaseToRunLine(app: 'no-release' | 'no-answer'): string {
  return `No release to run: the cache is empty and ${
    app === 'no-release' ? 'the app names no release' : 'the app did not answer'
  }`;
}

/** `reason` is the failure or the HTTP status of the request for the document. */
export function documentNotFetchedLine(reason: string): string {
  return `Release document not fetched (${reason})`;
}

/** `reason` is the failure or the HTTP status of the request for the object. */
export function releaseNotFetchedLine(
  sequence: number,
  what: 'archive' | 'walkerOS secrets',
  reason: string,
): string {
  return `Release ${releaseLabel(sequence)} ${what} not fetched (${reason})`;
}

/** Who answered a request with 401 or 403: the app, or the storage its redirect pointed to. */
export type RefusingSide = 'app' | 'storage';

function sideText(side: RefusingSide): string {
  return side === 'app' ? 'the app' : 'storage';
}

export function documentRefusedByLine(
  side: RefusingSide,
  status: number,
): string {
  return `Release document refused by ${sideText(side)} (${status})`;
}

export function releaseRefusedByLine(
  sequence: number,
  what: 'archive' | 'walkerOS secrets',
  side: RefusingSide,
  status: number,
): string {
  return `Release ${releaseLabel(sequence)} ${what} refused by ${sideText(side)} (${status})`;
}

/** A release this instance cannot start for a fact of its own: its heap or its disk. */
export function notStartedLine(sequence: number, reason: string): string {
  return `Release ${releaseLabel(sequence)} not started on this instance: ${reason}`;
}

/** A crashed release whose restart missed its ready deadline, and when it is tried again. */
export function restartNotReadyLine(
  sequence: number,
  deadlineMs: number,
  delayMs: number,
): string {
  return `Release ${releaseLabel(sequence)} not ready within ${delayText(deadlineMs)} after a restart, starting it again in ${delayText(delayMs)}`;
}

/** A crashed release whose restart could not start, and when it is tried again. */
export function restartNotStartedLine(
  sequence: number,
  reason: string,
  delayMs: number,
): string {
  return `${notStartedLine(sequence, reason)}; starting it again in ${delayText(delayMs)}`;
}

export function checkInRefusedLine(
  status: number,
  nextDelayMs: number,
): string {
  return `Check-in refused (${status}), serving on; next check-in in ${delayText(nextDelayMs)}`;
}

/** `reason` is the failure or the HTTP status, as the parenthesis shows it. */
export function checkInFailedLine(reason: string, nextDelayMs: number): string {
  return `Check-in failed (${reason}), serving on; next check-in in ${delayText(nextDelayMs)}`;
}

export function checkInAnsweredLine(): string {
  return 'Check-in answered again';
}

/** A cached document a check refused on load; it stays on disk. */
export function cachedDocumentSkippedLine(
  sha256: string,
  check: RefusalCheck,
): string {
  return `Cached release document ${shortSha(sha256)} skipped (${check})`;
}

/**
 * A cached document this instance cannot read; it stays on disk, since
 * another instance may. `code` is the error's code, never its message.
 */
export function cachedDocumentUnreadLine(sha256: string, code: string): string {
  return `Cached release document ${shortSha(sha256)} not read: ${code}`;
}

export function cachedArtifactRemovedLine(sha256: string): string {
  return `Cached artifact ${shortSha(sha256)} failed its check and was removed`;
}

/** A cached sealed set this runner's key did not open; the app is asked next. */
export function cachedSecretsRemovedLine(sequence: number): string {
  return `Cached walkerOS secrets of ${releaseLabel(sequence)} did not open and were removed`;
}

/**
 * A cached sealed set the cache could not read, taken as not cached; the app
 * is asked next. `code` is the error's code, never its message, which names
 * the path and the key id.
 */
export function cachedSecretsUnreadLine(
  sequence: number,
  code: string,
): string {
  return `Cached walkerOS secrets of ${releaseLabel(sequence)} not read: ${code}`;
}

/** A cached sealed set that did not open and could not be removed; the app is asked next. `code` as above. */
export function cachedSecretsNotRemovedLine(
  sequence: number,
  code: string,
): string {
  return `Cached walkerOS secrets of ${releaseLabel(sequence)} did not open and were not removed: ${code}`;
}

/**
 * A sealed set the cache did not take; the release goes on with the values
 * it holds. `code` is the error's code (`ENOSPC`, `EACCES`), never its
 * message, which names the path and the key id.
 */
export function secretsNotCachedLine(sequence: number, code: string): string {
  return `Release ${releaseLabel(sequence)} walkerOS secrets not cached: ${code}`;
}

/**
 * A web release a server release serves, as its lines name it: the served
 * path and the web sequence, never the web deployment's id, which a person
 * does not know and the redactor may mask (`remote.served` keys by it). No
 * sequence when a cache fault kept the release from being known.
 */
export interface ServedFileFacts {
  path: string;
  sequence?: number;
}

function servedText({ path, sequence }: ServedFileFacts): string {
  return sequence === undefined
    ? `Served file ${path}`
    : `Served file ${path} ${releaseLabel(sequence)}`;
}

/** `was` is the web sequence it replaces in a running release's folder; none in a fresh extraction. */
export function servedPlacedLine(
  file: ServedFileFacts,
  sha256: string,
  was?: number,
): string {
  const replaced =
    was === undefined || was === file.sequence
      ? ''
      : `, was ${releaseLabel(was)}`;
  return `${servedText(file)} placed (${shortSha(sha256)}${replaced})`;
}

/** A web document or file a check refused; that sequence is not fetched again. */
export function servedRefusedLine(
  file: ServedFileFacts,
  check: RefusalCheck,
): string {
  return `${servedText(file)} refused (${check})`;
}

/** `reason` is the failure or the HTTP status of the request for the web document or file. */
export function servedNotFetchedLine(
  file: ServedFileFacts,
  reason: string,
): string {
  return `${servedText(file)} not fetched (${reason})`;
}

export function servedRefusedByLine(
  file: ServedFileFacts,
  side: RefusingSide,
  status: number,
): string {
  return `${servedText(file)} refused by ${sideText(side)} (${status})`;
}

/**
 * Why a web release was not placed: a fault's error code, a check the
 * folder failed (a check reads in parentheses, since `placed:` and a long
 * value would read as a key and its value), or a cached file gone since it
 * was checked.
 */
export type NotPlacedReason =
  | { code: string }
  | { check: RefusalCheck }
  | 'not-cached';

export function servedNotPlacedLine(
  file: ServedFileFacts,
  why: NotPlacedReason,
): string {
  if (why === 'not-cached')
    return `${servedText(file)} not placed: not in the cache`;
  return 'check' in why
    ? `${servedText(file)} not placed (${why.check})`
    : `${servedText(file)} not placed: ${why.code}`;
}
