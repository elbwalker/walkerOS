import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import type {
  CheckInAnswer,
  Logger,
  PrivateEcJwk,
  ReleaseDocument,
  ServiceCredential,
} from '@walkeros/core';
import { createKnownValues, type KnownValues } from '@walkeros/core/node';
import type { CounterSnapshot } from '../../heartbeat.js';
import type { RecentError } from '../../log-ring.js';
import { appLinkFromEnvironment, type AppLink } from '../../remote/app-link.js';
import { createReleaseCache, type ReleaseCache } from '../../remote/cache.js';
import type {
  ChildMessage,
  ChildReport,
  ChildStart,
  SupervisorMessage,
} from '../../remote/ipc.js';
import { ReleaseRefusal, sha256Hex } from '../../remote/release-document.js';
import {
  createSupervisor,
  type ChildHandle,
  type Supervisor,
  type SupervisorDeps,
  type SupervisorTimers,
} from '../../remote/supervisor.js';
import type { ReleaseFixture } from './release-fixture.js';
import { sealSecretSet, valuesSealed } from './seal.js';
import { startStandInApp, type StandInApp } from './stand-in-app.js';

export interface Line {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
}

/** A logger that keeps every line it is given. */
export function recordingLogger(lines: Line[]): Logger.Instance {
  const record =
    (level: Line['level']) =>
    (message: string | Error): void => {
      lines.push({
        level,
        message: message instanceof Error ? message.message : message,
      });
    };
  const logger: Logger.Instance = {
    error: record('error'),
    warn: record('warn'),
    info: record('info'),
    debug: record('debug'),
    throw: (message: string | Error): never => {
      throw message instanceof Error ? message : new Error(message);
    },
    json: () => {},
    scope: () => logger,
    mask: (text) => text,
  };
  return logger;
}

/** A clock the test moves: timers fire only on `advance`. */
export function manualTimers() {
  let now = 0;
  const pending: Array<{ at: number; ms: number; callback: () => void }> = [];
  const timers: SupervisorTimers = {
    now: () => now,
    after(ms, callback) {
      const timer = { at: now + ms, ms, callback };
      pending.push(timer);
      return () => {
        const index = pending.indexOf(timer);
        if (index >= 0) pending.splice(index, 1);
      };
    },
  };
  return {
    timers,
    /** The delays of the timers still waiting, in the order they were set. */
    waiting: () => pending.map((timer) => timer.ms),
    advance(ms: number) {
      now += ms;
      for (const timer of [...pending].sort((a, b) => a.at - b.at)) {
        if (timer.at > now || !pending.includes(timer)) continue;
        pending.splice(pending.indexOf(timer), 1);
        timer.callback();
      }
    },
  };
}

/** How a fake child behaves after its fork. */
export interface ChildBehaviour {
  /** `ready`: sends ready at once; `wait`: the test calls `ready()`; `exit`: exits before ready. */
  start?: 'ready' | 'wait' | 'exit';
  exitCode?: number;
  /** Sent before the exit of a child whose start fails. */
  failed?: ChildMessage;
  /** `exit` (code 0) by default; `ignore` keeps running until SIGKILL. */
  onSigterm?: 'exit' | 'ignore';
  /** The counters each report carries; none by default. */
  counters?: () => CounterSnapshot | undefined;
  /** False: asks are not answered. */
  answers?: boolean;
  /** The errors each report carries, as the child's ring holds them. */
  errors?: RecentError[];
}

export class FakeChild implements ChildHandle {
  readonly sent: SupervisorMessage[] = [];
  readonly signals: NodeJS.Signals[] = [];
  exited = false;
  isReady = false;
  readonly pid = undefined;
  private readonly messageListeners: Array<(message: ChildMessage) => void> =
    [];
  private readonly exitListeners: Array<
    (code: number | null, signal: NodeJS.Signals | null) => void
  > = [];

  constructor(
    readonly start: ChildStart,
    readonly heapMb: number,
    readonly behaviour: ChildBehaviour,
    private readonly onEvent: (event: string) => void,
  ) {}

  get sequence(): number {
    return this.start.sequence;
  }

  send(message: SupervisorMessage): void {
    this.sent.push(message);
    if (message.type === 'report' && this.behaviour.answers !== false)
      this.later(() => this.report('asked'));
  }

  onMessage(listener: (message: ChildMessage) => void): void {
    this.messageListeners.push(listener);
  }

  onExit(
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): void {
    this.exitListeners.push(listener);
  }

  kill(signal: NodeJS.Signals): void {
    this.signals.push(signal);
    this.onEvent(`${signal} v${this.sequence}`);
    if (signal === 'SIGKILL') this.later(() => this.exit(null, 'SIGKILL'));
    else if (!this.isReady)
      // Before ready the pipeline has no signal handler: the signal ends it.
      this.later(() => this.exit(null, signal));
    else if (this.behaviour.onSigterm !== 'ignore')
      this.later(() => {
        // A ready child drains and reports once more, as the pipeline does.
        this.report('asked');
        this.exit(0);
      });
  }

  emit(message: ChildMessage): void {
    if (this.exited) return;
    for (const listener of this.messageListeners) listener(message);
  }

  ready(): void {
    this.isReady = true;
    this.emit({ type: 'ready' });
  }

  report(reason: ChildReport['reason'], extra: Partial<ChildReport> = {}) {
    const counters = this.behaviour.counters?.();
    this.emit({
      type: 'report',
      reason,
      ...(counters && { counters }),
      release: `dv_r${this.sequence}`,
      errors: this.behaviour.errors ?? [],
      logs: [],
      ...extra,
    });
  }

  exit(code: number | null, signal: NodeJS.Signals | null = null): void {
    if (this.exited) return;
    this.exited = true;
    this.onEvent(`exit v${this.sequence}`);
    for (const listener of this.exitListeners) listener(code, signal);
  }

  /** After the current turn, as a real child's messages arrive. */
  private later(work: () => void): void {
    setImmediate(work);
  }
}

/** Waits until `check` holds, polling on real time, at most 5 s. */
export async function until(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('condition not met within 5 s');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/** An fs error as Node gives it: a message and its code. */
export function fault(code: string): Error {
  return Object.assign(new Error(`${code}: i/o error`), { code });
}

/** The refusal `work` rejects with; anything else it throws is thrown again. */
export async function refusalOf(
  work: Promise<unknown>,
): Promise<ReleaseRefusal> {
  try {
    await work;
  } catch (error) {
    if (error instanceof ReleaseRefusal) return error;
    throw error;
  }
  throw new Error('no refusal');
}

/** Lets pending I/O and immediates run. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

/** Every regular file under `folder`, by its path. */
function filesUnder(folder: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    const entry = lstatSync(path);
    if (entry.isDirectory()) found.push(...filesUnder(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

/** A check-in answer as the app writes it: the release it names and each served web part's newest sequence. */
export function answer(
  release: number | null,
  served: Record<string, number> = {},
): CheckInAnswer {
  return { release, served };
}

/** A fixture whose document is changed, its bytes and sha256 with it. */
export function withDocument(
  release: ReleaseFixture,
  change: (document: ReleaseDocument) => Record<string, unknown>,
): ReleaseFixture {
  const documentBytes = new TextEncoder().encode(
    JSON.stringify(change(release.document)),
  );
  return {
    ...release,
    documentBytes,
    documentSha256: sha256Hex(documentBytes),
  };
}

export interface Harness {
  supervisor: Supervisor;
  standIn: StandInApp;
  /** The runner's credential, which the stand-in holds, and its string. */
  credential: ServiceCredential;
  raw: string;
  /** Every answer the supervisor handed the link, in order. */
  answers: Array<{ status: number; headers?: Headers }>;
  /** The lines of the link's credential client, apart from the supervisor's. */
  linkLines: Line[];
  cache: ReleaseCache;
  folder: string;
  cacheDir: string;
  env: NodeJS.ProcessEnv;
  knownValues: KnownValues;
  lines: Line[];
  errors(): string[];
  events: string[];
  children: FakeChild[];
  /** The newest child of a sequence. */
  child(sequence: number): FakeChild;
  alive(): FakeChild[];
  port: { open: boolean };
  clock: ReturnType<typeof manualTimers>;
  /** Per sequence; the default child gets ready at once. */
  behaviours: Map<number, ChildBehaviour>;
  heap: { mb: number; fails: boolean; onCall?: () => void };
  /** Called with each start message as the child is forked. */
  onSpawn?: (start: ChildStart) => void;
  /** Signs in the link's place while set, as a slow or failing signer would. */
  signStep?: AppLink['signStep'];
  /** Writes a release's objects into the cache, as another instance would. */
  cacheRelease(release: ReleaseFixture): Promise<void>;
  /**
   * Seals a release's walkerOS values to `key` (the runner's own by default)
   * and caches them under its key id, as an instance holding that key would;
   * answers the sealed bytes.
   */
  cacheSealedSet(
    release: ReleaseFixture,
    key?: PrivateEcJwk,
  ): Promise<Uint8Array>;
  /**
   * The files under the cache folder, by their path inside it, that hold a
   * secret: any value the test sealer sealed (the stand-in's sets and the
   * test's own), any value the supervisor knows (the credential's string
   * among them), or a private key of the credential.
   */
  filesHoldingSecrets(): string[];
  close(): Promise<void>;
}

export async function createHarness(
  options: {
    env?: NodeJS.ProcessEnv;
    readyDeadlineMs?: number;
    /** The cache the supervisor sees, around the real one: a fault, a hold or a count. */
    cache?: (real: ReleaseCache) => ReleaseCache;
  } = {},
): Promise<Harness> {
  const root = mkdtempSync(join(tmpdir(), 'walkeros-supervisor-test-'));
  const folder = join(root, 'instance');
  mkdirSync(folder);
  const cacheDir = join(root, 'cache');
  const lines: Line[] = [];
  const events: string[] = [];
  const children: FakeChild[] = [];
  const behaviours = new Map<number, ChildBehaviour>();
  const port = { open: false };
  const heap: Harness['heap'] = { mb: 200, fails: false };
  const clock = manualTimers();
  const logger = recordingLogger(lines);
  const standIn = await startStandInApp();
  const { credential, raw } = await standIn.pair();
  const cache = await createReleaseCache(cacheDir, logger);
  const knownValues = createKnownValues();
  const env: NodeJS.ProcessEnv = { ...options.env };
  // The client's own lines (no token bought, requests signed, a refusal)
  // are kept apart, so each test reads the supervisor's lines alone.
  const linkLines: Line[] = [];
  const linked = appLinkFromEnvironment({
    env: { WALKEROS_CREDENTIAL: raw },
    logger: recordingLogger(linkLines),
    knownValues,
  });
  const answers: Harness['answers'] = [];
  const hooks: {
    onSpawn?: (start: ChildStart) => void;
    signStep?: AppLink['signStep'];
  } = {};
  const link: AppLink = {
    ...linked,
    answered(answer) {
      answers.push(answer);
      linked.answered(answer);
    },
    signStep: (request) => (hooks.signStep ?? linked.signStep)(request),
  };

  const deps: SupervisorDeps = {
    link,
    cache: options.cache ? options.cache(cache) : cache,
    folder,
    instanceId: '3f9a2b7c1d4e5f60',
    port: 8080,
    env,
    knownValues,
    logger,
    spawnChild: (start, heapMb) => {
      hooks.onSpawn?.(start);
      const behaviour = behaviours.get(start.sequence) ?? {};
      const child = new FakeChild(start, heapMb, behaviour, (event) =>
        events.push(event),
      );
      children.push(child);
      events.push(`spawn v${start.sequence}`);
      const begin = behaviour.start ?? 'ready';
      if (begin === 'ready') setImmediate(() => child.ready());
      if (begin === 'exit')
        setImmediate(() => {
          if (behaviour.failed) child.emit(behaviour.failed);
          child.exit(behaviour.exitCode ?? 1);
        });
      return child;
    },
    portServer: {
      open: async () => {
        port.open = true;
        events.push('port open');
      },
      close: async () => {
        port.open = false;
        events.push('port close');
      },
    },
    heapMb: () => {
      heap.onCall?.();
      if (heap.fails)
        throw new Error(
          'Heap 36 MB for the flow is below the 64 MB minimum: three quarters of 128 MB granted, less 60 MB for the supervisor',
        );
      return heap.mb;
    },
    readyDeadlineMs: options.readyDeadlineMs,
    timers: clock.timers,
  };

  const supervisor = createSupervisor(deps);
  return {
    get onSpawn() {
      return hooks.onSpawn;
    },
    set onSpawn(hook) {
      hooks.onSpawn = hook;
    },
    get signStep() {
      return hooks.signStep;
    },
    set signStep(hook) {
      hooks.signStep = hook;
    },
    supervisor,
    standIn,
    credential,
    raw,
    answers,
    linkLines,
    cache,
    folder,
    cacheDir,
    env,
    knownValues,
    lines,
    errors: () =>
      lines
        .filter((line) => line.level === 'error')
        .map((line) => line.message),
    events,
    children,
    child(sequence) {
      const found = children.filter((child) => child.sequence === sequence);
      const newest = found[found.length - 1];
      if (!newest) throw new Error(`no child of v${sequence}`);
      return newest;
    },
    alive: () => children.filter((child) => !child.exited),
    port,
    clock,
    behaviours,
    heap,
    async cacheRelease(release) {
      await cache.storeDocument(release.documentBytes, release.documentSha256);
      async function* once(): AsyncGenerator<Uint8Array> {
        yield release.archive;
      }
      await cache.storeArtifact(once(), release.artifact, 'archive');
    },
    async cacheSealedSet(release, key = credential.enc) {
      const { deployment, sequence } = release.document;
      const sealed = await sealSecretSet({
        key,
        deployment,
        sequence,
        values: release.values,
      });
      await cache.storeSealedSet(key.kid, sequence, sealed);
      return sealed;
    },
    filesHoldingSecrets() {
      const secrets = [
        ...valuesSealed(),
        ...knownValues.values(),
        credential.sig.d,
        credential.enc.d,
      ];
      return filesUnder(cacheDir)
        .filter((path) => {
          const text = readFileSync(path).toString('latin1');
          return secrets.some((secret) => text.includes(secret));
        })
        .map((path) => relative(cacheDir, path));
    },
    async close() {
      linked.close();
      await standIn.stop();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
