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

/** A refusal by a check; the secret checks name the variables, never values. */
export function releaseRefusedLine(refusal: {
  check: RefusalCheck;
  sequence?: number;
  names?: readonly string[];
}): string {
  const subject =
    refusal.sequence === undefined
      ? 'Release document'
      : `Release ${releaseLabel(refusal.sequence)}`;
  const names =
    refusal.names && refusal.names.length > 0
      ? `: ${refusal.names.join(', ')}`
      : '';
  return `${subject} refused (${refusal.check}${names})`;
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

export function cachedArtifactRemovedLine(sha256: string): string {
  return `Cached artifact ${shortSha(sha256)} failed its check and was removed`;
}
