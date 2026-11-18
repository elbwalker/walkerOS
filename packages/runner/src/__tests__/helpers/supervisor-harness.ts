import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Logger, ReleaseDocument } from '@walkeros/core';
import { createKnownValues, type KnownValues } from '@walkeros/core/node';
import type { CounterSnapshot } from '../../heartbeat.js';
import type { RecentError } from '../../log-ring.js';
import { appLinkFromEnvironment } from '../../remote/app-link.js';
import { createReleaseCache, type ReleaseCache } from '../../remote/cache.js';
import type {
  ChildMessage,
  ChildReport,
  ChildStart,
  SupervisorMessage,
} from '../../remote/ipc.js';
import { sha256Hex } from '../../remote/release-document.js';
import {
  createSupervisor,
  type ChildHandle,
  type Supervisor,
  type SupervisorDeps,
  type SupervisorTimers,
} from '../../remote/supervisor.js';
import { FIXTURE_DEPLOYMENT, type ReleaseFixture } from './release-fixture.js';
import { startStandInApp, type StandInApp } from './stand-in-app.js';

export const TOKEN = 'stand-in-token-for-tests';

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

/** Lets pending I/O and immediates run. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
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
  /** Writes a release's objects into the cache, as another instance would. */
  cacheRelease(release: ReleaseFixture): Promise<void>;
  close(): Promise<void>;
}

export async function createHarness(
  options: { env?: NodeJS.ProcessEnv; readyDeadlineMs?: number } = {},
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
  const standIn = await startStandInApp({ token: TOKEN });
  const cache = await createReleaseCache(cacheDir, logger);
  const knownValues = createKnownValues();
  const env: NodeJS.ProcessEnv = { ...options.env };
  const link = appLinkFromEnvironment({
    env: {
      WALKEROS_APP_URL: standIn.origin,
      WALKEROS_DEPLOYMENT_ID: FIXTURE_DEPLOYMENT,
      WALKEROS_DEPLOY_TOKEN: TOKEN,
    },
    logger,
    knownValues,
  });

  const hooks: { onSpawn?: (start: ChildStart) => void } = {};
  const deps: SupervisorDeps = {
    link,
    cache,
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
    supervisor,
    standIn,
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
      await cache.storeArtifact(once(), release.artifact);
    },
    async close() {
      await standIn.stop();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
