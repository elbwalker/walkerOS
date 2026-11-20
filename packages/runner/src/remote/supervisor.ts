/**
 * The supervisor of `runneros remote`: it takes releases from the app, checks
 * each before any of its code runs, and runs the flow of one release at a
 * time in a child process of its own.
 *
 * One release at a time: every consider, boot and fallback runs in one
 * serial chain. A new release is fetched and checked while the old child
 * serves; only then does the old child drain and the new one start (a swap
 * by restart). A child that is not ready in time, or ends before it is, is
 * refused on this instance and the highest good release below it starts. A
 * child that ends after it was ready is a crash: the same release starts
 * again after a back-off, outside the chain, so a download in the chain
 * never holds a crashed release down. While no child runs the supervisor
 * holds the port with a server that answers 503.
 *
 * Refusal marks live in memory: the per-instance folder they would live in
 * lasts exactly as long as this process. Every secret value the supervisor
 * handles is known to the loggers before a child is forked, and reaches the
 * cache only sealed, as it arrived.
 *
 * A server release may serve web parts (`served.ts`). One extraction
 * function, for a boot, a swap, a fallback and a crash restart, extracts a
 * release's folder and places each listed path's current web release,
 * under one lock per release folder. At a swap, while the old child
 * serves, the named web releases are fetched before the fork. At a boot
 * with an empty cache they are fetched before the fork for at most
 * `BOOT_WEB_FETCH_MS`: the app has just served the release, and a web file
 * not there by then is placed right after the fork. Every other start (a
 * boot from the cache, a fallback, a crash restart) forks with what the
 * cache holds, the archive's own copies included. Each start but a swap
 * queues a web consider, which fetches a newer web release and places it
 * into the running folder with no restart. A web part never stops its
 * server release from serving.
 */

import { rm } from 'fs/promises';
import { join } from 'path';
import {
  SHUTDOWN_DEADLINE_MS,
  type CheckInAnswer,
  type Logger,
  type RefusalCheck,
  type ReleaseDocument,
  type RemoteLast,
  type RemoteReport,
  type ServedDeployment,
} from '@walkeros/core';
import {
  maskKnownValues,
  type CompiledKnown,
  type KnownValues,
} from '@walkeros/core/node';
import {
  ChannelError,
  conditionalGet,
  openStream,
} from '@walkeros/server-core';
import { archiveUrl, releaseSecretsUrl, releaseUrl } from '../api-paths.js';
import { errorSinkPath } from '../error-sink.js';
import {
  computeCounterDelta,
  type CounterPayload,
  type CounterSnapshot,
} from '../heartbeat.js';
import type { RecentError, RecentLogEntry } from '../log-ring.js';
import {
  checkReleaseSecrets,
  serverSecretValues,
  type InjectionPlan,
} from '../secret-injection.js';
import { appCall, type AppLink } from './app-link.js';
import {
  newestFirst,
  SEALED_SET_MAX_BYTES,
  type ArtifactKind,
  type CachedRelease,
  type ReleaseCache,
} from './cache.js';
import { codeOf, messageOf } from './errors.js';
import type {
  ChildMessage,
  ChildReport,
  ChildStart,
  SignAnswer,
  SignRequest,
  SupervisorMessage,
} from './ipc.js';
import {
  cachedSecretsNotRemovedLine,
  cachedSecretsRemovedLine,
  cachedSecretsUnreadLine,
  crashLine,
  documentNotFetchedLine,
  documentRefusedByLine,
  exitedBeforeReadyLine,
  noReleaseCanRunLine,
  noReleaseToRunLine,
  notReadyLine,
  notStartedLine,
  releaseNotFetchedLine,
  releaseRefusedByLine,
  releaseRefusedLine,
  releaseRunningLine,
  releaseStartingLine,
  restartNotReadyLine,
  restartNotStartedLine,
  archiveNotCachedLine,
  secretsNotCachedLine,
  skippedLine,
  startingAgainLine,
  type ChildExit,
  type NoReleaseReason,
  type ReleaseFacts,
  type RefusingSide,
} from './lines.js';
import {
  DOCUMENT_MAX_BYTES,
  ReleaseRefusal,
  readReleaseDocument,
} from './release-document.js';
import { addCounters } from './report.js';
import {
  createServedFiles,
  type ArtifactFetch,
  type DocumentFetch,
  type RequestFailure,
  type WebCurrents,
} from './served.js';

/** From a child's fork until it must be ready. */
export const READY_DEADLINE_MS = 60_000;
/** After SIGTERM, a child still alive is killed: past its own force exit. */
export const CHILD_KILL_AFTER_MS = SHUTDOWN_DEADLINE_MS + 1500;
/** How long a check-in waits for the report it asked a child for. */
export const REPORT_WAIT_MS = 1000;
/**
 * The most signs of one child that wait for the signer at once, so a
 * runaway flow cannot swell the supervisor's memory; past it a sign is
 * refused at once.
 */
export const SIGNS_IN_FLIGHT_MAX = 64;
/**
 * The whole wait of a boot with an empty cache for the web files its release
 * lists, from the start of that web step: a hanging web file never holds the
 * first fork past it.
 */
export const BOOT_WEB_FETCH_MS = 3000;

const DOCUMENT_TIMEOUT_MS = 10_000;
const SECRET_SET_TIMEOUT_MS = 10_000;
const ARCHIVE_TIMEOUT_MS = 300_000;

/**
 * A refusal names at most this many variables, each cut to this length, in
 * its line and in `remote.last`, so one odd document never makes a check-in
 * body the app refuses.
 */
const REFUSAL_MAX_NAMES = 20;
const REFUSAL_NAME_MAX_LENGTH = 128;

const CRASH_FIRST_DELAY_MS = 1000;
const CRASH_MAX_DELAY_MS = 60_000;
/** A child ready this long has served well: its next crash waits the first delay again. */
const CRASH_RESET_AFTER_MS = 60_000;

/**
 * When a start fetches the web releases its release lists: before its fork
 * (a swap, while the old child serves), before its fork for at most
 * `BOOT_WEB_FETCH_MS` (a boot with an empty cache), or after its fork
 * (every other start, which forks with what the cache holds).
 */
type WebStep = 'before-fork' | 'bounded' | 'after-fork';

/** The supervisor's end of a child process. */
export interface ChildHandle {
  send(message: SupervisorMessage): void;
  onMessage(listener: (message: ChildMessage) => void): void;
  onExit(
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): void;
  kill(signal: NodeJS.Signals): void;
  readonly pid?: number;
}

/** The supervisor's clock: real timers unless a test brings its own. */
export interface SupervisorTimers {
  now(): number;
  /** Runs `callback` after `ms`; the answer cancels it. */
  after(ms: number, callback: () => void): () => void;
}

export interface SupervisorDeps {
  link: AppLink;
  cache: ReleaseCache;
  /** The per-instance folder: extractions under `releases/`, the error sink. */
  folder: string;
  instanceId: string;
  port: number;
  /** The environment a child starts from: the secret checks read it. */
  env: NodeJS.ProcessEnv;
  knownValues: KnownValues;
  logger: Logger.Instance;
  spawnChild(start: ChildStart, heapMb: number): ChildHandle;
  /** The supervisor's own server on the port, for while no child holds it. */
  portServer: { open(): Promise<void>; close(): Promise<void> };
  /** Throws below 64 MB; called in each release's checks phase, before the old child stops. */
  heapMb(): number;
  readyDeadlineMs?: number;
  timers?: SupervisorTimers;
}

/**
 * The children's part of one check-in: the counters since the last check-in
 * that was taken, the running child's release, and the errors and lines of
 * every child that reported, masked again with every value held now.
 */
export interface ChildrenReport {
  counters?: CounterPayload;
  release?: string;
  errors: RecentError[];
  logs: RecentLogEntry[];
  /** The check-in carrying it was taken: these counters and the drained children's errors are not sent again. */
  taken(): void;
}

export interface Supervisor {
  /** `named` is the boot check-in's answer; undefined when it did not answer. */
  boot(
    named: CheckInAnswer | undefined,
  ): Promise<'serving' | 'waiting' | 'nothing'>;
  /**
   * Works toward the release the answer names, then the web releases it
   * names for the running release's web parts; resolves once that work is
   * done.
   */
  consider(named: CheckInAnswer): Promise<void>;
  state(): RemoteReport;
  /** Asks the running child for its report, waiting at most 1000 ms. */
  report(): Promise<ChildrenReport>;
  /** Stops the child; resolves with its exit code, or 0 when none ran. */
  stop(): Promise<number>;
}

type Release = CachedRelease;

interface Prepared extends Release {
  flowFile: string;
  values: Record<string, string>;
  heapMb: number;
  /**
   * The values the child masks: this release's own walkerOS and server
   * values. The supervisor's own values (its credential) never reach a child.
   */
  known: string[];
}

interface ChildRecord {
  readonly prepared: Prepared;
  readonly handle: ChildHandle;
  readonly exited: Promise<ChildExit>;
  ready: boolean;
  readyAt: number;
  /** Asked to stop: its exit is no crash. */
  stopping: boolean;
  exit?: ChildExit;
  /** The names the child refused its secrets by. */
  refused?: InjectionPlan['refused'];
  latest?: ChildReport;
  /** The counters the last taken check-in carried. */
  reported: CounterSnapshot;
  /** Set while a launch waits for this child's ready. */
  onReady?: () => void;
  onAsked: Array<() => void>;
  /** Its signs still waiting for the signer. */
  signing: number;
}

const NOTHING_REPORTED: CounterSnapshot = {
  in: 0,
  out: 0,
  failed: 0,
  destinations: {},
};

const realTimers: SupervisorTimers = {
  now: () => Date.now(),
  after(ms, callback) {
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
  },
};

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let settle: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, resolve: (value) => settle(value) };
}

function sequenceOf(record: ChildRecord): number {
  return record.prepared.document.sequence;
}

function factsOf(release: Release): ReleaseFacts {
  const { document } = release;
  return {
    sequence: document.sequence,
    sha256: document.artifact.sha256,
    flowName: document.flowName,
  };
}

/** A failed request as its line names it: the HTTP status, else the failure. */
function reasonOf(error: ChannelError): string {
  return error.status === undefined ? error.failure : String(error.status);
}

/**
 * The side that refused a request, by the hop that answered: storage after
 * the archive's redirect, else the app. A failure without a hop is the
 * app's only when it came from a request's own answer.
 */
function refusingSide(
  error: ChannelError,
  fromRequest: boolean,
): RefusingSide | undefined {
  if (error.hop === 'redirect') return 'storage';
  if (error.hop === 'origin' || fromRequest) return 'app';
  return undefined;
}

/** A failed request as its line names it: a 401 or 403 by the side that answered it, the rest by the failure or the status. */
function failureOf(error: ChannelError, fromRequest: boolean): RequestFailure {
  const side =
    error.failure === 'refused' ? refusingSide(error, fromRequest) : undefined;
  return side && error.status !== undefined
    ? { side, status: error.status }
    : { reason: reasonOf(error) };
}

/** An error no step expected, in one line. */
function stepFailedLine(error: unknown): string {
  return `Release step failed: ${messageOf(error)}`;
}

/** Exit code of a child: its own, or 1 for a signal. */
function exitCodeOf(exit: ChildExit | undefined): number {
  if (!exit) return 0;
  return exit.code ?? 1;
}

function remaskErrors(
  errors: readonly RecentError[],
  known: CompiledKnown,
): RecentError[] {
  return errors.map((error) => ({
    ...error,
    message: maskKnownValues(error.message, known),
  }));
}

function remaskLogs(
  logs: readonly RecentLogEntry[],
  known: CompiledKnown,
): RecentLogEntry[] {
  return logs.map((entry) => ({
    ...entry,
    message: maskKnownValues(entry.message, known),
  }));
}

export function createSupervisor(deps: SupervisorDeps): Supervisor {
  const { link, cache, logger, knownValues } = deps;
  const timers = deps.timers ?? realTimers;
  const readyDeadlineMs = deps.readyDeadlineMs ?? READY_DEADLINE_MS;
  const deployment = link.deploymentId;
  const releasesFolder = join(deps.folder, 'releases');

  /** Sequences refused on this instance, with what `last` said. */
  const marks = new Map<number, RemoteLast>();
  const everReady = new Set<number>();
  const everStarted = new Set<number>();
  const extracted = new Set<number>();
  /** Each release's walkerOS secret values, once opened: values only grow. */
  const secretSets = new Map<number, Record<string, string>>();

  let last: RemoteLast | null = null;
  let current: ChildRecord | undefined;
  /** The sequence of the last child that was ready. */
  let lastRunning: number | undefined;
  let lastExit: ChildExit | undefined;
  /** Children gone whose last report the next check-in still carries. */
  let ended: ChildRecord[] = [];
  let stopping = false;
  let stopped: Promise<number> | undefined;
  let swapping = false;
  let cancelCrash: (() => void) | undefined;
  let crashDelayMs = CRASH_FIRST_DELAY_MS;
  /** The last failed-request line: one per change of state. */
  let lastFetchFailure: string | undefined;
  /**
   * The highest `secretsSince` of every document this process read, from
   * the app or the cache: a cached file that is gone or damaged later never
   * lowers the floor.
   */
  let floorSeen = 0;
  function noteFloor(document: ReleaseDocument): void {
    floorSeen = Math.max(floorSeen, document.secretsSince);
  }

  // The port server's opens and closes apply in the order they were asked.
  let portChain: Promise<void> = Promise.resolve();
  const port = {
    open: () => portStep('open'),
    close: () => portStep('close'),
  };
  function portStep(step: 'open' | 'close'): Promise<void> {
    portChain = portChain.then(async () => {
      try {
        await (step === 'open'
          ? deps.portServer.open()
          : deps.portServer.close());
      } catch (error) {
        logger.error(
          `The port server did not ${step} on port ${deps.port}: ${messageOf(error)}`,
        );
      }
    });
    return portChain;
  }

  // One release at a time: boot, every consider and every fallback.
  let chain: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(task);
    chain = run.catch(() => undefined);
    return run;
  }

  function running(): number | null {
    return current && current.ready && !current.exit
      ? sequenceOf(current)
      : null;
  }

  /** `last` names the newest sequence this instance saw and does not run. */
  function noteLast(entry: RemoteLast): void {
    if (last === null || entry.sequence >= last.sequence) last = entry;
  }

  /**
   * Marks `sequence` refused and writes the line. `shown` is the sequence the
   * line names: none for a document whose sequence did not read.
   */
  function refuse(
    refusal: { check: RefusalCheck; names?: readonly string[]; fact?: string },
    sequence: number,
    shown: number | undefined,
  ): void {
    const names =
      refusal.names && refusal.names.length > 0
        ? refusal.names
            .slice(0, REFUSAL_MAX_NAMES)
            .map((name) => [...name].slice(0, REFUSAL_NAME_MAX_LENGTH).join(''))
        : undefined;
    const entry: RemoteLast = names
      ? { sequence, state: 'refused', check: refusal.check, names: [...names] }
      : { sequence, state: 'refused', check: refusal.check };
    marks.set(sequence, entry);
    noteLast(entry);
    logger.error(
      releaseRefusedLine({
        check: refusal.check,
        sequence: shown,
        names,
        fact: refusal.fact,
      }),
    );
  }

  /** A secret refusal names the first check and every name it holds. */
  function refuseSecrets(
    sequence: number,
    refused: InjectionPlan['refused'],
  ): void {
    const check = refused[0].reason;
    const names = refused
      .filter((item) => item.reason === check)
      .map((item) => item.name);
    refuse({ check, names }, sequence, sequence);
  }

  function failNotReady(sequence: number, line: string): void {
    const entry: RemoteLast = { sequence, state: 'failed', check: 'not-ready' };
    marks.set(sequence, entry);
    noteLast(entry);
    logger.error(line);
  }

  function fetchFailed(line: string): void {
    if (line === lastFetchFailure) return;
    lastFetchFailure = line;
    logger.error(line);
  }

  /**
   * A failed request, once per change of state: a 401 or 403 names the side
   * that answered it, the rest the failure or the status. Nothing is marked
   * either way; the next check-in asks again.
   */
  function requestFailed(
    subject:
      | { what: 'document' }
      | { what: 'archive' | 'walkerOS secrets'; sequence: number },
    failure: RequestFailure,
  ): void {
    if (subject.what === 'document')
      fetchFailed(
        'side' in failure
          ? documentRefusedByLine(failure.side, failure.status)
          : documentNotFetchedLine(failure.reason),
      );
    else
      fetchFailed(
        'side' in failure
          ? releaseRefusedByLine(
              subject.sequence,
              subject.what,
              failure.side,
              failure.status,
            )
          : releaseNotFetchedLine(
              subject.sequence,
              subject.what,
              failure.reason,
            ),
      );
  }

  /** Taken already: refused here, or the release of the current child. */
  function settledFor(sequence: number): boolean {
    return (
      marks.has(sequence) ||
      (current !== undefined && sequenceOf(current) === sequence)
    );
  }

  /**
   * The one document fetch, for the server part and each web part: a
   * conditional GET with the part's high-water ETag, the answer read
   * against that part's deployment and mark.
   */
  async function getDocument(part: {
    deployment: string;
    url: string;
  }): Promise<DocumentFetch> {
    const highWater = await cache.highWater(part.deployment);
    let answer: Awaited<ReturnType<typeof conditionalGet>>;
    try {
      answer = await appCall(
        link,
        () =>
          conditionalGet({
            url: part.url,
            authorize: link.authorize,
            timeoutMs: DOCUMENT_TIMEOUT_MS,
            maxBytes: DOCUMENT_MAX_BYTES,
            ...(highWater && { etag: `"${highWater.sha256}"` }),
          }),
        (got) => got.status,
      );
    } catch (error) {
      if (!(error instanceof ChannelError)) throw error;
      if (error.failure === 'size')
        return { got: 'refused', refusal: new ReleaseRefusal('document-size') };
      return { got: 'failed', failure: failureOf(error, true) };
    }
    if (answer.status === 404) return { got: 'none' };
    if (answer.status === 304) {
      const cached = (await cache.documents(part.deployment)).find(
        (entry) => entry.sha256 === highWater?.sha256,
      );
      return cached ? { got: 'document', release: cached } : { got: 'gone' };
    }
    try {
      const release = readReleaseDocument(answer.body, {
        deployment: part.deployment,
        highWater,
      });
      return { got: 'document', release, bytes: answer.body };
    } catch (error) {
      if (!(error instanceof ReleaseRefusal)) throw error;
      return { got: 'refused', refusal: error };
    }
  }

  /** The document the app serves now; refusals are marked and logged. */
  async function fetchDocument(
    named: number,
  ): Promise<{ release: Release; bytes?: Uint8Array } | undefined> {
    const got = await getDocument({ deployment, url: releaseUrl(link.origin) });
    switch (got.got) {
      case 'document':
        noteFloor(got.release.document);
        return { release: got.release, bytes: got.bytes };
      case 'refused':
        refuse(
          got.refusal,
          got.refusal.sequence ?? named,
          got.refusal.sequence,
        );
        return undefined;
      case 'failed':
        requestFailed({ what: 'document' }, got.failure);
        return undefined;
      // Nothing is released, though the check-in named a release.
      case 'none':
        fetchFailed(documentNotFetchedLine('404'));
        return undefined;
      case 'gone':
        return undefined;
    }
  }

  /**
   * The one artifact fetch, for a server release's archive and a web
   * release's file: checked in the cache, else fetched by the document's
   * release (the archive route's one redirect followed with no credentials)
   * and stored.
   */
  async function getArtifact(
    release: Release,
    kind: ArtifactKind,
  ): Promise<ArtifactFetch> {
    const { artifact } = release.document;
    if (await cache.checkArtifact(artifact, kind)) return { got: 'stored' };
    let chunks: AsyncIterable<Uint8Array>;
    try {
      chunks = await appCall(
        link,
        () =>
          openStream({
            url: archiveUrl(link.origin, release.document.release),
            authorize: link.authorize,
            timeoutMs: ARCHIVE_TIMEOUT_MS,
            followRedirectWithoutCredentials: true,
          }),
        () => 200,
      );
    } catch (error) {
      if (!(error instanceof ChannelError)) throw error;
      return { got: 'failed', failure: failureOf(error, true) };
    }
    try {
      // The cache caps the body at the document's bytes, which the reader
      // bounds at the largest archive.
      await cache.storeArtifact(chunks, artifact, kind);
      return { got: 'stored' };
    } catch (error) {
      if (error instanceof ReleaseRefusal)
        return { got: 'refused', refusal: error };
      // The body's read failed: its hop, if any, names the side.
      if (error instanceof ChannelError)
        return { got: 'failed', failure: failureOf(error, false) };
      return { got: 'fault', error };
    }
  }

  /**
   * The release's archive in the cache: checked, else fetched. `cacheOnly`
   * is a cold boot's and a fallback's: an archive the cache does not hold
   * skips the release with one line, so a start from the cache never waits
   * for the app; a newer named release is the consider's to fetch.
   */
  async function ensureArtifact(
    release: Release,
    cacheOnly = false,
  ): Promise<boolean> {
    const { sequence } = release.document;
    if (cacheOnly) {
      if (await cache.checkArtifact(release.document.artifact, 'archive'))
        return true;
      logger.error(archiveNotCachedLine(sequence));
      return false;
    }
    const got = await getArtifact(release, 'archive');
    switch (got.got) {
      case 'stored':
        return true;
      // A refusal from the cache names no sequence: the document's is added.
      case 'refused':
        refuse(got.refusal, sequence, sequence);
        return false;
      case 'failed':
        requestFailed({ what: 'archive', sequence }, got.failure);
        return false;
      // A disk fault is this instance's, not the release's.
      case 'fault':
        logger.error(notStartedLine(sequence, messageOf(got.error)));
        return false;
    }
  }

  const servedFiles = createServedFiles({
    cache,
    logger,
    origin: link.origin,
    fetchDocument: getDocument,
    fetchArtifact: getArtifact,
  });

  /**
   * Opens a release's sealed set with this credential's key and checks it
   * names every walkerOS secret the release reads; throws ReleaseRefusal
   * 'secret-set'. Its values are known from the moment they are held,
   * whatever the release does next.
   */
  async function openSet(
    bytes: Uint8Array,
    document: ReleaseDocument,
  ): Promise<Record<string, string>> {
    const { sequence } = document;
    const values = await link.readSecretSet(bytes, { deployment, sequence });
    knownValues.add(Object.values(values));
    // A set without a name the release reads would start a flow without it.
    if (document.secrets.app.some((name) => !Object.hasOwn(values, name)))
      throw new ReleaseRefusal('secret-set', sequence);
    return values;
  }

  /**
   * The release's walkerOS secret values: from memory, else from the set
   * the cache holds under this credential's key id, else from the app. A
   * cached set that does not open is removed and fetched again; a set under
   * another key id is never read. A cache fault in reading or removing a
   * set is one line with its code, and the set counts as not cached: the
   * app is asked, and with the app down the release waits for it like any
   * set the cache does not hold.
   */
  async function secretValues(
    release: Release,
  ): Promise<Record<string, string> | 'needs-app' | undefined> {
    const { sequence } = release.document;
    const held = secretSets.get(sequence);
    if (held) return held;
    let cached: Uint8Array | undefined;
    try {
      cached = await cache.sealedSet(link.keyId, sequence);
    } catch (error) {
      logger.error(cachedSecretsUnreadLine(sequence, codeOf(error)));
    }
    if (cached) {
      try {
        const values = await openSet(cached, release.document);
        secretSets.set(sequence, values);
        return values;
      } catch (error) {
        if (!(error instanceof ReleaseRefusal)) throw error;
        try {
          await cache.removeSealedSet(link.keyId, sequence);
          logger.error(cachedSecretsRemovedLine(sequence));
        } catch (removal) {
          logger.error(cachedSecretsNotRemovedLine(sequence, codeOf(removal)));
        }
      }
    }
    return fetchSecretSet(release);
  }

  /**
   * The release's walkerOS secret values from the app, cached as they
   * arrived once they opened: 'needs-app' when the app did not answer.
   */
  async function fetchSecretSet(
    release: Release,
  ): Promise<Record<string, string> | 'needs-app' | undefined> {
    const { document } = release;
    const { sequence } = document;
    let answer: Awaited<ReturnType<typeof conditionalGet>>;
    try {
      answer = await appCall(
        link,
        () =>
          conditionalGet({
            url: releaseSecretsUrl(link.origin, document.release),
            authorize: link.authorize,
            timeoutMs: SECRET_SET_TIMEOUT_MS,
            maxBytes: SEALED_SET_MAX_BYTES,
          }),
        (got) => got.status,
      );
    } catch (error) {
      if (!(error instanceof ChannelError)) throw error;
      if (error.failure === 'size') {
        refuse({ check: 'secret-set' }, sequence, sequence);
        return undefined;
      }
      requestFailed(
        { what: 'walkerOS secrets', sequence },
        failureOf(error, true),
      );
      return 'needs-app';
    }
    // The app serves the current release's values only: this one is past.
    if (answer.status !== 200) {
      logger.error(skippedLine(sequence));
      return undefined;
    }
    let values: Record<string, string>;
    try {
      values = await openSet(answer.body, document);
    } catch (error) {
      if (!(error instanceof ReleaseRefusal)) throw error;
      refuse(error, sequence, sequence);
      return undefined;
    }
    secretSets.set(sequence, values);
    try {
      await cache.storeSealedSet(link.keyId, sequence, answer.body);
    } catch (error) {
      // The values are held in memory: the release goes on without a cached copy.
      logger.error(secretsNotCachedLine(sequence, codeOf(error)));
    }
    return values;
  }

  function folderOf(sequence: number): string {
    return join(releasesFolder, String(sequence));
  }

  /**
   * One lock per release folder: an extraction (a swap's, a boot's, a
   * fallback's or a crash restart's) and a placement into a running folder
   * never write one folder at once, so whichever runs last writes what is
   * current then.
   */
  const folderLocks = new Map<number, Promise<unknown>>();
  function underFolderLock<T>(
    sequence: number,
    task: () => Promise<T>,
  ): Promise<T> {
    const run = (folderLocks.get(sequence) ?? Promise.resolve()).then(task);
    const held = run.catch(() => undefined);
    folderLocks.set(sequence, held);
    void held.then(() => {
      if (folderLocks.get(sequence) === held) folderLocks.delete(sequence);
    });
    return run;
  }

  /**
   * A web fetch an empty-cache boot stopped waiting for at its cap: the web
   * consider queued after that boot's fork waits for it, then places what
   * it brought.
   */
  let bootWebFetch: Promise<WebCurrents> | undefined;

  /**
   * The web releases the newest answer names above their newest cached
   * release, fetched before a fork: in full at a swap, for at most
   * `BOOT_WEB_FETCH_MS` at a boot with an empty cache. Undefined when the
   * cap passed first: the extraction then looks up the cache itself, and
   * whatever arrives later is placed after the fork.
   */
  async function fetchServedBeforeFork(
    served: readonly ServedDeployment[],
    named: CheckInAnswer,
    step: 'before-fork' | 'bounded',
  ): Promise<WebCurrents | undefined> {
    const fetching = servedFiles.fetchNamed(served, named);
    if (step === 'before-fork') return fetching;
    let cancel: () => void = () => {};
    const capped = new Promise<undefined>((resolve) => {
      cancel = timers.after(BOOT_WEB_FETCH_MS, () => resolve(undefined));
    });
    let currents: WebCurrents | undefined;
    try {
      currents = await Promise.race([fetching, capped]);
    } finally {
      cancel();
    }
    if (currents === undefined) bootWebFetch = fetching;
    return currents;
  }

  /**
   * The one extraction, for a boot, a swap, a fallback and a crash restart.
   * First, outside the lock, the web step (`WebStep`): at a swap and at a
   * boot with an empty cache the web releases the newest answer names are
   * fetched before the fork; a fetch that fails never refuses the server
   * release. Then, under the folder's lock, the folder removed, the archive
   * extracted and each listed path given its current web release. Resolves
   * with the flow.mjs path; throws a ReleaseRefusal naming no sequence, or a
   * fault of this instance.
   */
  async function extractRelease(
    release: Release,
    webStep: WebStep,
  ): Promise<string> {
    const { document } = release;
    const { sequence } = document;
    const currents =
      webStep !== 'after-fork' && document.served && newest
        ? await fetchServedBeforeFork(document.served, newest, webStep)
        : undefined;
    return underFolderLock(sequence, async () => {
      const into = folderOf(sequence);
      await rm(into, { recursive: true, force: true });
      extracted.add(sequence);
      const flowFile = await cache.extractArtifact(document.artifact, into);
      await servedFiles.place(document, into, 'extraction', currents);
      return flowFile;
    });
  }

  /** A refusal that says the cached archive is gone or damaged since its check. */
  function isObjectGone(error: unknown): boolean {
    return (
      error instanceof ReleaseRefusal &&
      (error.check === 'artifact-bytes' || error.check === 'artifact-sha256')
    );
  }

  /** Extracts into `releases/<sequence>/`; an object gone since its check is fetched once more. */
  async function extract(
    release: Release,
    options: { webStep: WebStep; cacheOnly: boolean },
  ): Promise<string | undefined> {
    const { sequence } = release.document;
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await extractRelease(
          release,
          attempt === 0 ? options.webStep : 'after-fork',
        );
      } catch (error) {
        if (!(error instanceof ReleaseRefusal)) {
          logger.error(notStartedLine(sequence, messageOf(error)));
          return undefined;
        }
        if (isObjectGone(error) && attempt === 0) {
          if (await ensureArtifact(release, options.cacheOnly)) continue;
          return undefined;
        }
        refuse(error, sequence, sequence);
        return undefined;
      }
    }
  }

  /**
   * Every check a release passes before its child forks, on a download and
   * on every load from the cache: the secret names against this
   * environment, the heap, the archive, the walkerOS secret set and the
   * extraction. `documentBytes` are stored once the names pass.
   * `webStep` is when the named web releases are fetched (`WebStep`), after
   * the fork unless named. `cacheOnly` is a cold boot's and a fallback's:
   * the archive is taken from the cache only.
   */
  async function prepare(
    release: Release,
    options: {
      documentBytes?: Uint8Array;
      webStep?: WebStep;
      cacheOnly?: boolean;
    } = {},
  ): Promise<Prepared | 'needs-app' | undefined> {
    const { documentBytes } = options;
    const webStep = options.webStep ?? 'after-fork';
    const cacheOnly = options.cacheOnly ?? false;
    const { document } = release;
    const { sequence } = document;
    const refused = checkReleaseSecrets(document.secrets, deps.env);
    if (refused.length > 0) {
      refuseSecrets(sequence, refused);
      return undefined;
    }
    if (documentBytes) await cache.storeDocument(documentBytes, release.sha256);

    let heapMb: number;
    try {
      heapMb = deps.heapMb();
    } catch (error) {
      failNotReady(sequence, notStartedLine(sequence, messageOf(error)));
      return undefined;
    }

    if (!(await ensureArtifact(release, cacheOnly))) return undefined;

    let values: Record<string, string> = {};
    if (document.secrets.app.length > 0) {
      const held = await secretValues(release);
      if (held === undefined || held === 'needs-app') return held;
      values = held;
    }

    const flowFile = await extract(release, { webStep, cacheOnly });
    if (flowFile === undefined) return undefined;

    // Known before the child logs its first line.
    const known = [
      ...Object.values(values),
      ...serverSecretValues(document.secrets.server, deps.env),
    ];
    knownValues.add(known);
    lastFetchFailure = undefined;
    return { ...release, flowFile, values, heapMb, known };
  }

  function stopChild(record: ChildRecord): Promise<ChildExit> {
    if (!record.stopping) {
      record.stopping = true;
      if (!record.exit) {
        record.handle.kill('SIGTERM');
        const cancel = timers.after(CHILD_KILL_AFTER_MS, () => {
          if (!record.exit) record.handle.kill('SIGKILL');
        });
        void record.exited.then(cancel);
      }
    }
    return record.exited;
  }

  function onChildMessage(record: ChildRecord, message: ChildMessage): void {
    switch (message.type) {
      case 'ready': {
        const done = record.onReady;
        if (!done) return;
        record.onReady = undefined;
        record.ready = true;
        record.readyAt = timers.now();
        done();
        return;
      }
      case 'failed':
        record.refused = message.refused;
        return;
      case 'report': {
        record.latest = message;
        // A report that comes after the exit still goes out once.
        if (record.exit && !ended.includes(record)) ended.push(record);
        // An asked report answers every ask waiting, the drain's unasked one too.
        if (message.reason === 'asked') {
          const waiting = record.onAsked;
          record.onAsked = [];
          for (const done of waiting) done();
        }
        return;
      }
      case 'format':
        return;
      case 'sign':
        signFor(record, message);
        return;
    }
  }

  /**
   * Signs one ingest write of a child's steps with the link's door signer,
   * which applies the one door rule, never with the app's `authorize`. A
   * refused sign is the step's own error, so it writes no line here; the
   * answer for a child that has exited is dropped. A draining child is still
   * signed for: its last writes need it.
   */
  function signFor(record: ChildRecord, request: SignRequest): void {
    const { id } = request;
    if (record.signing >= SIGNS_IN_FLIGHT_MAX) {
      record.handle.send({
        type: 'sign-refused',
        id,
        message: `${SIGNS_IN_FLIGHT_MAX} signing requests are in flight`,
      });
      return;
    }
    record.signing += 1;
    void link
      .signStep({
        method: request.method,
        url: request.url,
        contentDigest: request.contentDigest,
      })
      .then(
        (headers): SignAnswer => ({
          type: 'signed',
          id,
          headers: {
            'Signature-Input': headers['Signature-Input'],
            Signature: headers.Signature,
          },
        }),
        (error: unknown): SignAnswer => ({
          type: 'sign-refused',
          id,
          message: messageOf(error),
        }),
      )
      .then((answer) => {
        record.signing -= 1;
        if (!record.exit) record.handle.send(answer);
      });
  }

  function onChildExit(record: ChildRecord): void {
    if (record.latest && !ended.includes(record)) ended.push(record);
    if (stopping) return;
    void port.open();
    if (record === current && record.ready && !record.stopping && record.exit)
      crashed(record, record.exit);
  }

  function watch(prepared: Prepared, handle: ChildHandle): ChildRecord {
    const exit = deferred<ChildExit>();
    const record: ChildRecord = {
      prepared,
      handle,
      exited: exit.promise,
      ready: false,
      readyAt: 0,
      stopping: false,
      reported: NOTHING_REPORTED,
      onAsked: [],
      signing: 0,
    };
    handle.onMessage((message) => onChildMessage(record, message));
    handle.onExit((code, signal) => {
      if (record.exit) return;
      record.exit = { code, signal };
      lastExit = record.exit;
      exit.resolve(record.exit);
      onChildExit(record);
    });
    return record;
  }

  function readyOrNot(
    record: ChildRecord,
  ): Promise<'ready' | 'deadline' | 'exited'> {
    return new Promise((resolve) => {
      let cancel: () => void = () => {};
      const settle = (outcome: 'ready' | 'deadline' | 'exited') => {
        cancel();
        record.onReady = undefined;
        resolve(outcome);
      };
      record.onReady = () => settle('ready');
      cancel = timers.after(readyDeadlineMs, () => settle('deadline'));
      void record.exited.then(() => settle('exited'));
    });
  }

  type Launched =
    | 'ready'
    | 'stopped'
    | { record: ChildRecord; cause: 'deadline' | 'exited' };

  /**
   * Forks a child for `prepared` and waits for its ready. The port server
   * closes first; `still` is asked right before the fork, after every wait.
   * `afterFork` runs right after the fork.
   */
  async function launch(
    prepared: Prepared,
    still: () => boolean,
    afterFork?: () => void,
  ): Promise<Launched> {
    await port.close();
    if (stopping || !still()) return 'stopped';
    const sequence = prepared.document.sequence;
    const start: ChildStart = {
      type: 'start',
      instanceId: deps.instanceId,
      sequence,
      flowFile: prepared.flowFile,
      folder: deps.folder,
      port: deps.port,
      values: { ...prepared.values },
      known: [...prepared.known],
    };
    const record = watch(prepared, deps.spawnChild(start, prepared.heapMb));
    current = record;
    everStarted.add(sequence);
    afterFork?.();
    const outcome = await readyOrNot(record);
    if (outcome === 'ready') {
      everReady.add(sequence);
      lastRunning = sequence;
      if (last?.sequence === sequence) last = null;
      return 'ready';
    }
    if (outcome === 'deadline') await stopChild(record);
    if (stopping) return 'stopped';
    return { record, cause: outcome };
  }

  /** The next restart of the same release after the back-off, with its line. */
  function restartLater(
    record: ChildRecord,
    line: (delayMs: number) => string,
  ): void {
    const delay = crashDelayMs;
    crashDelayMs = Math.min(delay * 2, CRASH_MAX_DELAY_MS);
    logger.error(line(delay));
    cancelCrash = timers.after(delay, () => {
      cancelCrash = undefined;
      void restart(record);
    });
  }

  /** A crash: the same release again after the back-off, never another. */
  function crashed(record: ChildRecord, exit: ChildExit): void {
    if (record.ready && timers.now() - record.readyAt >= CRASH_RESET_AFTER_MS)
      crashDelayMs = CRASH_FIRST_DELAY_MS;
    restartLater(record, (delay) => crashLine(sequenceOf(record), exit, delay));
  }

  /** A release seen ready that did not get ready again: a crash, named by how it ended. */
  function notReadyAgain(
    record: ChildRecord,
    cause: 'deadline' | 'exited',
  ): void {
    if (cause === 'deadline')
      restartLater(record, (delay) =>
        restartNotReadyLine(sequenceOf(record), readyDeadlineMs, delay),
      );
    else crashed(record, record.exit ?? { code: null, signal: null });
  }

  /**
   * The release's extraction made again from its archive, re-hashed, with
   * the current web releases placed: the crashed child could write its own
   * folder. It fetches nothing, so the restart never waits for the app.
   * Answers why not, on a failure.
   */
  async function extractAgain(
    prepared: Prepared,
  ): Promise<
    { ok: true } | { ok: false; reason: string; objectGone: boolean }
  > {
    try {
      await extractRelease(prepared, 'after-fork');
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof ReleaseRefusal
            ? `extraction refused (${error.check})`
            : messageOf(error),
        objectGone: isObjectGone(error),
      };
    }
  }

  /** Crashed releases whose archive the app's copy refused in this process: never downloaded again here. */
  const refetchRefused = new Map<number, RefusalCheck>();

  /**
   * The archive of a crashed release, gone from the cache since its check,
   * fetched again: stored, or why not. No reason means the extraction's own
   * stands (a failed request writes its own line). A refusal marks nothing,
   * since the release ran and a crash restart is never a refusal, and that
   * archive is not downloaded again in this process: the restarts go on
   * from the cache, where another instance may store a good copy.
   */
  async function refetchArchive(
    release: Release,
  ): Promise<{ stored: true } | { stored: false; reason?: string }> {
    const { sequence } = release.document;
    const seen = refetchRefused.get(sequence);
    if (seen !== undefined)
      return { stored: false, reason: `archive refused (${seen})` };
    let got: ArtifactFetch;
    try {
      got = await getArtifact(release, 'archive');
    } catch (error) {
      // A cache fault: one line with its code, and the back-off goes on,
      // since nothing else would start this release again.
      return { stored: false, reason: codeOf(error) };
    }
    switch (got.got) {
      case 'stored':
        return { stored: true };
      case 'refused':
        refetchRefused.set(sequence, got.refusal.check);
        return {
          stored: false,
          reason: `archive refused (${got.refusal.check})`,
        };
      case 'failed':
        requestFailed({ what: 'archive', sequence }, got.failure);
        return { stored: false };
      case 'fault':
        return { stored: false, reason: codeOf(got.error) };
    }
  }

  /**
   * Starts a crashed release again: its archive extracted afresh, the same
   * values, the same sink. An extraction that fails backs off again on the
   * same release, never another, and marks nothing. An archive gone from
   * the cache since (a sibling removed a damaged copy) is fetched first
   * (`refetchArchive`): nothing serves meanwhile, so the fetch holds
   * nothing. It forks with what the cache holds and queues a web consider
   * right after the fork.
   */
  async function restart(record: ChildRecord): Promise<void> {
    const still = () => !swapping && current === record;
    if (stopping || !still()) return;
    let extraction = await extractAgain(record.prepared);
    if (stopping || !still()) return;
    if (!extraction.ok && extraction.objectGone) {
      const refetched = await refetchArchive(record.prepared);
      if (stopping || !still()) return;
      if (refetched.stored) {
        extraction = await extractAgain(record.prepared);
        if (stopping || !still()) return;
      } else if (refetched.reason !== undefined)
        extraction = { ok: false, reason: refetched.reason, objectGone: true };
    }
    if (!extraction.ok) {
      const { reason } = extraction;
      restartLater(record, (delay) =>
        restartNotStartedLine(sequenceOf(record), reason, delay),
      );
      return;
    }
    const outcome = await launch(record.prepared, still, queueServed);
    if (outcome === 'stopped') return;
    if (outcome === 'ready') {
      logger.info(releaseRunningLine(factsOf(record.prepared)));
      return;
    }
    // Not ready again: another crash, not a refusal (no automatic rollback).
    const again = outcome.record;
    if (stopping || swapping || current !== again || !again.exit) return;
    notReadyAgain(again, outcome.cause);
  }

  /** Each removal under its folder's lock: a crash restart may still extract that folder. */
  async function removeExtractionsBut(sequence: number): Promise<void> {
    for (const other of [...extracted]) {
      if (other === sequence) continue;
      await underFolderLock(other, () =>
        rm(folderOf(other), { recursive: true, force: true }),
      );
      extracted.delete(other);
      servedFiles.forget(other);
    }
  }

  /**
   * Starts a release that is not a crash restart: with an empty error sink,
   * so the previous release's errors are not reported again under it. A
   * sequence not yet seen ready in this process that does not get ready is
   * refused on this instance; one seen ready before counts as a crash.
   * `afterFork` runs right after its fork.
   */
  async function startRelease(
    prepared: Prepared,
    was: number | undefined,
    afterFork?: () => void,
  ): Promise<'ready' | 'refused' | 'stopped' | 'crashed'> {
    const sequence = prepared.document.sequence;
    await rm(errorSinkPath(deps.folder), { force: true });
    crashDelayMs = CRASH_FIRST_DELAY_MS;
    logger.info(
      everStarted.has(sequence)
        ? startingAgainLine(sequence)
        : releaseStartingLine(factsOf(prepared)),
    );
    noteLast({ sequence, state: 'starting' });
    const outcome = await launch(prepared, () => true, afterFork);
    if (outcome === 'stopped') return 'stopped';
    if (outcome === 'ready') {
      logger.info(
        releaseRunningLine(
          factsOf(prepared),
          was !== undefined && was !== sequence ? was : undefined,
        ),
      );
      await removeExtractionsBut(sequence);
      return 'ready';
    }
    const { record, cause } = outcome;
    const exit = record.exit ?? { code: null, signal: null };
    if (everReady.has(sequence)) {
      notReadyAgain(record, cause);
      return 'crashed';
    }
    if (record.refused && record.refused.length > 0)
      refuseSecrets(sequence, record.refused);
    else
      failNotReady(
        sequence,
        cause === 'deadline'
          ? notReadyLine(sequence, readyDeadlineMs)
          : exitedBeforeReadyLine(sequence, exit),
      );
    return 'refused';
  }

  /**
   * Starts the highest good cached release below `below` (any, without it)
   * and at or above the floor, the highest `secretsSince` in the cache:
   * never one whose secret values a later release changed. Each candidate
   * passes every check again first. A boot from the cache and a fallback
   * fork with what the cache holds and queue a web consider right after
   * the fork.
   */
  async function startBest(
    below: number | undefined,
    was: number | undefined,
  ): Promise<'serving' | 'none'> {
    const cached = newestFirst(await cache.documents(deployment));
    for (const entry of cached) noteFloor(entry.document);
    const floor = floorSeen;
    let needsApp: number | undefined;
    let belowFloor = false;
    for (const release of cached) {
      if (stopping) return 'none';
      const { sequence } = release.document;
      if (below !== undefined && sequence >= below) continue;
      if (sequence < floor) {
        belowFloor = true;
        break;
      }
      if (marks.has(sequence)) continue;
      const prepared = await prepare(release, { cacheOnly: true });
      if (prepared === 'needs-app') {
        needsApp ??= sequence;
        continue;
      }
      if (prepared === undefined) continue;
      const started = await startRelease(prepared, was, queueServed);
      if (started === 'ready' || started === 'crashed') return 'serving';
      if (started === 'stopped') return 'none';
    }
    if (stopping) return 'none';
    const why: NoReleaseReason =
      needsApp !== undefined
        ? { reason: 'secrets-need-app', sequence: needsApp }
        : belowFloor
          ? { reason: 'secrets-changed', sequence: floor }
          : { reason: 'no-good-release' };
    logger.error(noReleaseCanRunLine(why));
    await port.open();
    return 'none';
  }

  /**
   * The swap: the old child drains, then the new release starts. `afterFork`
   * runs right after the new child's fork.
   */
  async function swapTo(
    prepared: Prepared,
    afterFork?: () => void,
  ): Promise<void> {
    swapping = true;
    try {
      cancelCrash?.();
      cancelCrash = undefined;
      const was = lastRunning;
      const old = current;
      // The old child's exit opens the port server; the fork's close follows
      // it on the port chain, so the port is held from the exit to the fork.
      if (old && !old.exit) await stopChild(old);
      if (stopping) return;
      const started = await startRelease(prepared, was, afterFork);
      if (started === 'refused')
        await startBest(prepared.document.sequence, was);
    } finally {
      swapping = false;
    }
  }

  /**
   * One consider: the document the app serves (which may be newer than the
   * one named), every check, then the swap. A refusal leaves the serving
   * child untouched. While a child serves, the named web files are
   * fetched before the fork. With none alive, `idle` says when: `bounded`
   * at a boot with an empty cache, else after the fork; a web consider
   * right after the fork places what came later with no restart.
   */
  async function take(
    named: number,
    idle: WebStep = 'after-fork',
  ): Promise<void> {
    if (stopping || settledFor(named)) return;
    const fetched = await fetchDocument(named);
    if (!fetched || stopping || settledFor(fetched.release.document.sequence))
      return;
    const serving = current !== undefined && !current.exit;
    const prepared = await prepare(fetched.release, {
      documentBytes: fetched.bytes,
      webStep: serving ? 'before-fork' : idle,
    });
    if (prepared === undefined || prepared === 'needs-app' || stopping) return;
    await swapTo(prepared, serving ? undefined : queueServed);
  }

  /** The newest check-in answer: its web releases are what a web consider works toward. */
  let newest: CheckInAnswer | undefined;

  /**
   * The web consider: the web parts the held release lists, fetched where
   * the newest answer names one above its newest cached release, then the
   * current web release placed into the folder of a child that is alive,
   * with no restart. The held release is the current child's, running,
   * starting or waiting for its crash restart; a release refused here holds
   * none, and while no child is alive a crash restart's extraction places
   * what is current. A web fetch an empty-cache boot stopped waiting for
   * comes first: the files it brings are placed once they arrive. It never
   * sets `swapping`, which the crash restart reads.
   */
  async function considerServed(): Promise<void> {
    const held = current;
    if (stopping || !newest || !held || marks.has(sequenceOf(held))) return;
    const listed = held.prepared.document.served;
    if (!listed) return;
    const pending = bootWebFetch;
    bootWebFetch = undefined;
    if (pending) await pending;
    const currents = await servedFiles.fetchNamed(listed, newest);
    // A crash restart may have forked meanwhile: the same release, its folder.
    const live = current;
    if (stopping || !live || live.exit) return;
    const { document } = live.prepared;
    await underFolderLock(document.sequence, () =>
      servedFiles.place(
        document,
        folderOf(document.sequence),
        'running',
        currents,
      ),
    );
  }

  let servedQueued = false;
  /** A web consider in the serial chain for the newest answer; one waits at a time. */
  function queueServed(): void {
    if (servedQueued || stopping) return;
    servedQueued = true;
    void serial(async () => {
      servedQueued = false;
      await considerServed();
    }).catch((error: unknown) => {
      logger.error(stepFailedLine(error));
    });
  }

  let wanted: number | undefined;
  let queued: Promise<void> | undefined;

  function consider(named: CheckInAnswer): Promise<void> {
    if (stopping) return Promise.resolve();
    newest = named;
    if (named.release !== null) wanted = named.release;
    if (!queued)
      queued = serial(async () => {
        queued = undefined;
        const target = wanted;
        wanted = undefined;
        if (target !== undefined) await take(target);
        // After any server release the same answer names.
        await considerServed();
      }).catch((error: unknown) => {
        logger.error(stepFailedLine(error));
      });
    return queued;
  }

  async function boot(
    named: CheckInAnswer | undefined,
  ): Promise<'serving' | 'waiting' | 'nothing'> {
    if (named) newest = named;
    const result = await serial(async () => {
      await port.open();
      const cached = await cache.documents(deployment);
      if (cached.length === 0) {
        if (named === undefined || named.release === null) {
          logger.error(
            noReleaseToRunLine(
              named === undefined ? 'no-answer' : 'no-release',
            ),
          );
          return 'nothing';
        }
        await take(named.release, 'bounded');
        return running() === null ? 'waiting' : 'serving';
      }
      const best = await startBest(undefined, undefined);
      if (named && named.release !== null && (running() ?? 0) < named.release)
        void consider(named);
      return best === 'serving' ? 'serving' : 'waiting';
    }).catch((error: unknown) => {
      // A fault of this instance (its disk, its cache) stops the boot but
      // not the runner: the port server answers 503 and the next check-in's
      // consider tries again.
      logger.error(stepFailedLine(error));
      return 'waiting' as const;
    });
    return result;
  }

  function askReport(record: ChildRecord): Promise<void> {
    return new Promise((resolve) => {
      let cancel: () => void = () => {};
      const done = () => {
        cancel();
        record.onAsked = record.onAsked.filter((waiting) => waiting !== done);
        resolve();
      };
      record.onAsked.push(done);
      cancel = timers.after(REPORT_WAIT_MS, done);
      void record.exited.then(done);
      record.handle.send({ type: 'report' });
    });
  }

  async function report(): Promise<ChildrenReport> {
    const live = current && !current.exit ? current : undefined;
    if (live) await askReport(live);
    const records = [...ended, ...(live && live.latest ? [live] : [])];
    const known = knownValues.compiled();

    let counters: CounterPayload | undefined;
    const carried = new Map<ChildRecord, ChildReport | undefined>();
    const errors: RecentError[] = [];
    const logs: RecentLogEntry[] = [];
    // The running child's errors first: of one message, its own entry stays.
    for (const record of [...records].reverse()) {
      const latest = record.latest;
      carried.set(record, latest);
      if (!latest) continue;
      if (latest.counters) {
        const delta = computeCounterDelta(latest.counters, record.reported);
        counters = counters ? addCounters(delta, counters) : delta;
      }
      for (const error of remaskErrors(latest.errors, known))
        if (!errors.some((seen) => seen.message === error.message))
          errors.push(error);
      logs.push(...remaskLogs(latest.logs, known));
    }

    return {
      ...(counters && { counters }),
      ...(live?.latest?.release !== undefined && {
        release: live.latest.release,
      }),
      errors,
      logs,
      taken() {
        for (const [record, latest] of carried)
          if (latest?.counters) record.reported = latest.counters;
        // A drained child goes once; one that reported since stays for that.
        ended = ended.filter(
          (record) =>
            !carried.has(record) || record.latest !== carried.get(record),
        );
      },
    };
  }

  function stop(): Promise<number> {
    if (stopped) return stopped;
    stopping = true;
    cancelCrash?.();
    cancelCrash = undefined;
    stopped = (async () => {
      const record = current;
      if (record && !record.exit) await stopChild(record);
      return exitCodeOf(lastExit);
    })();
    return stopped;
  }

  function state(): RemoteReport {
    const sequence = running();
    const served =
      sequence !== null && current
        ? servedFiles.report(current.prepared.document)
        : undefined;
    return { running: sequence, last, ...(served && { served }) };
  }

  return {
    boot,
    consider,
    state,
    report,
    stop,
  };
}
