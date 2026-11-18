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
 * handles is known to the loggers before a child is forked.
 */

import { rm } from 'fs/promises';
import { join } from 'path';
import {
  SHUTDOWN_DEADLINE_MS,
  type Logger,
  type RefusalCheck,
  type ReleaseDocument,
  type RemoteLast,
  type RemoteState,
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
import type { AppLink } from './app-link.js';
import type { ReleaseCache } from './cache.js';
import { messageOf } from './errors.js';
import type {
  ChildMessage,
  ChildReport,
  ChildStart,
  SupervisorMessage,
} from './ipc.js';
import {
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

/** From a child's fork until it must be ready. */
export const READY_DEADLINE_MS = 60_000;
/** After SIGTERM, a child still alive is killed: past its own force exit. */
export const CHILD_KILL_AFTER_MS = SHUTDOWN_DEADLINE_MS + 1500;
/** How long a check-in waits for the report it asked a child for. */
export const REPORT_WAIT_MS = 1000;

const DOCUMENT_TIMEOUT_MS = 10_000;
const SECRET_SET_MAX_BYTES = 1_048_576;
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
  /** `named` is the boot check-in's release; undefined when it did not answer. */
  boot(
    named: number | null | undefined,
  ): Promise<'serving' | 'waiting' | 'nothing'>;
  /** Works toward the sequence the app names; resolves once that work is done. */
  consider(sequence: number | null): Promise<void>;
  state(): RemoteState;
  /** Asks the running child for its report, waiting at most 1000 ms. */
  report(): Promise<ChildrenReport>;
  /** Stops the child; resolves with its exit code, or 0 when none ran. */
  stop(): Promise<number>;
}

interface Release {
  document: ReleaseDocument;
  sha256: string;
}

interface Prepared extends Release {
  flowFile: string;
  values: Record<string, string>;
  heapMb: number;
  /**
   * The values the child masks: this release's own walkerOS and server
   * values. The supervisor's own values (its token) never reach a child.
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

/** An error no step expected, in one line. */
function stepFailedLine(error: unknown): string {
  return `Release step failed: ${messageOf(error)}`;
}

/** Exit code of a child: its own, or 1 for a signal. */
function exitCodeOf(exit: ChildExit | undefined): number {
  if (!exit) return 0;
  return exit.code ?? 1;
}

/** The cached releases, newest first; of two at one sequence the lower sha256, as the high-water mark takes. */
function newestFirst(entries: Release[]): Release[] {
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
  /** Each release's walkerOS secret values, once fetched: values only grow. */
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
    refusal: { check: RefusalCheck; names?: readonly string[] },
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
      releaseRefusedLine({ check: refusal.check, sequence: shown, names }),
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
    error: ChannelError,
    fromRequest: boolean,
  ): void {
    const side =
      error.failure === 'refused'
        ? refusingSide(error, fromRequest)
        : undefined;
    const { status } = error;
    if (subject.what === 'document')
      fetchFailed(
        side && status !== undefined
          ? documentRefusedByLine(side, status)
          : documentNotFetchedLine(reasonOf(error)),
      );
    else
      fetchFailed(
        side && status !== undefined
          ? releaseRefusedByLine(subject.sequence, subject.what, side, status)
          : releaseNotFetchedLine(
              subject.sequence,
              subject.what,
              reasonOf(error),
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

  /** The document the app serves now; refusals are marked and logged. */
  async function fetchDocument(
    named: number,
  ): Promise<{ release: Release; bytes?: Uint8Array } | undefined> {
    const highWater = await cache.highWater(deployment);
    let answer: Awaited<ReturnType<typeof conditionalGet>>;
    try {
      answer = await conditionalGet({
        url: releaseUrl(link.origin),
        authorize: link.authorize,
        timeoutMs: DOCUMENT_TIMEOUT_MS,
        maxBytes: DOCUMENT_MAX_BYTES,
        ...(highWater && { etag: `"${highWater.sha256}"` }),
      });
    } catch (error) {
      if (!(error instanceof ChannelError)) throw error;
      if (error.failure === 'size')
        refuse({ check: 'document-size' }, named, undefined);
      else requestFailed({ what: 'document' }, error, true);
      return undefined;
    }
    // Nothing is released, though the check-in named a release.
    if (answer.status === 404) {
      fetchFailed(documentNotFetchedLine('404'));
      return undefined;
    }
    if (answer.status === 304) {
      const cached = (await cache.documents(deployment)).find(
        (entry) => entry.sha256 === highWater?.sha256,
      );
      if (cached) noteFloor(cached.document);
      return cached && { release: cached };
    }
    try {
      const release = readReleaseDocument(answer.body, {
        deployment,
        highWater,
      });
      noteFloor(release.document);
      return { release, bytes: answer.body };
    } catch (error) {
      if (!(error instanceof ReleaseRefusal)) throw error;
      refuse(error, error.sequence ?? named, error.sequence);
      return undefined;
    }
  }

  /** The release's archive in the cache: checked, else fetched. */
  async function ensureArtifact(release: Release): Promise<boolean> {
    const { artifact, sequence } = release.document;
    if (await cache.checkArtifact(artifact)) return true;
    const subject = { what: 'archive', sequence } as const;
    let chunks: AsyncIterable<Uint8Array>;
    try {
      chunks = await openStream({
        url: archiveUrl(link.origin, release.document.release),
        authorize: link.authorize,
        timeoutMs: ARCHIVE_TIMEOUT_MS,
        followRedirectWithoutCredentials: true,
      });
    } catch (error) {
      if (!(error instanceof ChannelError)) throw error;
      requestFailed(subject, error, true);
      return false;
    }
    try {
      // The cache caps the body at the document's bytes, which the reader
      // bounds at the largest archive.
      await cache.storeArtifact(chunks, artifact);
      return true;
    } catch (error) {
      // A refusal from the cache names no sequence: the document's is added.
      if (error instanceof ReleaseRefusal) refuse(error, sequence, sequence);
      // The body's read failed: its hop, if any, names the side.
      else if (error instanceof ChannelError)
        requestFailed(subject, error, false);
      // A disk fault is this instance's, not the release's.
      else logger.error(notStartedLine(sequence, messageOf(error)));
      return false;
    }
  }

  /** The release's walkerOS secret values: 'needs-app' when the app did not answer. */
  async function fetchSecretSet(
    release: Release,
  ): Promise<Record<string, string> | 'needs-app' | undefined> {
    const { document } = release;
    const { sequence } = document;
    let answer: Awaited<ReturnType<typeof conditionalGet>>;
    try {
      answer = await conditionalGet({
        url: releaseSecretsUrl(link.origin, document.release),
        authorize: link.authorize,
        timeoutMs: SECRET_SET_TIMEOUT_MS,
        maxBytes: SECRET_SET_MAX_BYTES,
      });
    } catch (error) {
      if (!(error instanceof ChannelError)) throw error;
      if (error.failure === 'size') {
        refuse({ check: 'secret-set' }, sequence, sequence);
        return undefined;
      }
      requestFailed({ what: 'walkerOS secrets', sequence }, error, true);
      return 'needs-app';
    }
    // The app serves the current release's values only: this one is past.
    if (answer.status !== 200) {
      logger.error(skippedLine(sequence));
      return undefined;
    }
    try {
      const values = link.readSecretSet(answer.body, { deployment, sequence });
      // A set without a name the release reads would start a flow without it.
      // Known from the moment it is held, whatever the release does next.
      knownValues.add(Object.values(values));
      if (document.secrets.app.some((name) => !Object.hasOwn(values, name)))
        throw new ReleaseRefusal('secret-set', sequence);
      secretSets.set(sequence, values);
      return values;
    } catch (error) {
      if (!(error instanceof ReleaseRefusal)) throw error;
      refuse(error, sequence, sequence);
      return undefined;
    }
  }

  /** Extracts into `releases/<sequence>/`; an object gone since its check is fetched once more. */
  async function extract(release: Release): Promise<string | undefined> {
    const { sequence, artifact } = release.document;
    const into = join(releasesFolder, String(sequence));
    for (let attempt = 0; ; attempt += 1) {
      try {
        await rm(into, { recursive: true, force: true });
        extracted.add(sequence);
        return await cache.extractArtifact(artifact, into);
      } catch (error) {
        if (!(error instanceof ReleaseRefusal)) {
          logger.error(notStartedLine(sequence, messageOf(error)));
          return undefined;
        }
        const objectGone =
          error.check === 'artifact-bytes' || error.check === 'artifact-sha256';
        if (objectGone && attempt === 0) {
          if (await ensureArtifact(release)) continue;
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
   */
  async function prepare(
    release: Release,
    documentBytes?: Uint8Array,
  ): Promise<Prepared | 'needs-app' | undefined> {
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

    if (!(await ensureArtifact(release))) return undefined;

    let values: Record<string, string> = {};
    if (document.secrets.app.length > 0) {
      const held = secretSets.get(sequence) ?? (await fetchSecretSet(release));
      if (held === undefined || held === 'needs-app') return held;
      values = held;
    }

    const flowFile = await extract(release);
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
    }
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
   */
  async function launch(
    prepared: Prepared,
    still: () => boolean,
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
   * The release's extraction made again from its archive, re-hashed: the
   * crashed child could write its own folder. Answers why not, on a failure.
   */
  async function extractAgain(
    prepared: Prepared,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const { sequence, artifact } = prepared.document;
    try {
      await rm(join(releasesFolder, String(sequence)), {
        recursive: true,
        force: true,
      });
      extracted.add(sequence);
      await cache.extractArtifact(
        artifact,
        join(releasesFolder, String(sequence)),
      );
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof ReleaseRefusal
            ? `extraction refused (${error.check})`
            : messageOf(error),
      };
    }
  }

  /**
   * Starts a crashed release again: its archive extracted afresh, the same
   * values, the same sink. An extraction that fails backs off again on the
   * same release, never another, and marks nothing.
   */
  async function restart(record: ChildRecord): Promise<void> {
    const still = () => !swapping && current === record;
    if (stopping || !still()) return;
    const extraction = await extractAgain(record.prepared);
    if (stopping || !still()) return;
    if (!extraction.ok) {
      restartLater(record, (delay) =>
        restartNotStartedLine(sequenceOf(record), extraction.reason, delay),
      );
      return;
    }
    const outcome = await launch(record.prepared, still);
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

  async function removeExtractionsBut(sequence: number): Promise<void> {
    for (const other of [...extracted]) {
      if (other === sequence) continue;
      await rm(join(releasesFolder, String(other)), {
        recursive: true,
        force: true,
      });
      extracted.delete(other);
    }
  }

  /**
   * Starts a release that is not a crash restart: with an empty error sink,
   * so the previous release's errors are not reported again under it. A
   * sequence not yet seen ready in this process that does not get ready is
   * refused on this instance; one seen ready before counts as a crash.
   */
  async function startRelease(
    prepared: Prepared,
    was: number | undefined,
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
    const outcome = await launch(prepared, () => true);
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
   * passes every check again first.
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
      const prepared = await prepare(release);
      if (prepared === 'needs-app') {
        needsApp ??= sequence;
        continue;
      }
      if (prepared === undefined) continue;
      const started = await startRelease(prepared, was);
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

  /** The swap: the old child drains, then the new release starts. */
  async function swapTo(prepared: Prepared): Promise<void> {
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
      const started = await startRelease(prepared, was);
      if (started === 'refused')
        await startBest(prepared.document.sequence, was);
    } finally {
      swapping = false;
    }
  }

  /**
   * One consider: the document the app serves (which may be newer than the
   * one named), every check, then the swap. A refusal leaves the serving
   * child untouched.
   */
  async function take(named: number): Promise<void> {
    if (stopping || settledFor(named)) return;
    const fetched = await fetchDocument(named);
    if (!fetched || stopping || settledFor(fetched.release.document.sequence))
      return;
    const prepared = await prepare(fetched.release, fetched.bytes);
    if (prepared === undefined || prepared === 'needs-app' || stopping) return;
    await swapTo(prepared);
  }

  let wanted: number | undefined;
  let queued: Promise<void> | undefined;

  function consider(sequence: number | null): Promise<void> {
    if (sequence === null || stopping) return Promise.resolve();
    wanted = sequence;
    if (!queued)
      queued = serial(async () => {
        queued = undefined;
        const target = wanted;
        wanted = undefined;
        if (target !== undefined) await take(target);
      }).catch((error: unknown) => {
        logger.error(stepFailedLine(error));
      });
    return queued;
  }

  async function boot(
    named: number | null | undefined,
  ): Promise<'serving' | 'waiting' | 'nothing'> {
    const result = await serial(async () => {
      await port.open();
      const cached = await cache.documents(deployment);
      if (cached.length === 0) {
        if (named === null || named === undefined) {
          logger.error(
            noReleaseToRunLine(named === null ? 'no-release' : 'no-answer'),
          );
          return 'nothing';
        }
        await take(named);
        return running() === null ? 'waiting' : 'serving';
      }
      const best = await startBest(undefined, undefined);
      if (typeof named === 'number' && (running() ?? 0) < named)
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

  return {
    boot,
    consider,
    state: () => ({ running: running(), last }),
    report,
    stop,
  };
}
