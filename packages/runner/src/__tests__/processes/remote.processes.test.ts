/**
 * The runner's process suite: `runneros remote` as real processes (the fork,
 * IPC, the port hand-over, the cache boot, two supervisors on one cache)
 * against the stand-in app, run from the built dist/. It runs only by its own
 * command, `npm run test:processes` after a build, never in the default test
 * run, in a turbo task or in CI: before a prerelease that changes remote
 * mode, and when working on remote mode. The steps walk one run in order.
 * Restart gaps and memory are measured and printed, never asserted.
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'fs/promises';
import { request } from 'http';
import { createServer } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { gunzipSync } from 'zlib';
import { isObject } from '@walkeros/core';
import {
  buildRelease,
  FIXTURE_DEPLOYMENT,
  type ReleaseFixture,
} from '../helpers/release-fixture.js';
import { startStandInApp, type StandInApp } from '../helpers/stand-in-app.js';

const RUNNER = join(__dirname, '..', '..', '..');
const BIN = join(RUNNER, 'dist', 'bin.js');
const CHILD_ENTRY = join(RUNNER, 'dist', 'remote-child.js');

const TOKEN = 'process-suite-token';
/** The image's own heap setting, which `--heap` must win over. */
const IMAGE_NODE_OPTIONS = '--max-old-space-size=384 --no-warnings';
const HEAP_MB = 200;
const MIB = 1024 * 1024;
const APP_VALUE_V2 = 'plum-orchard-second';
const APP_VALUE_V3 = 'plum-orchard-third';
const SERVER_VALUE = 'harbor-lantern-salt';

/** A step that needs no check-in. */
const POLL_MS = 15_000;
/** A step that waits for the next check-in (every 30 s, ±10 %) and a start. */
const CHECK_IN_MS = 50_000;
/** The step timeout around one wait for the next check-in. */
const STEP_MS = 120_000;
/**
 * A step that waits for the first check-in after the app comes back, when
 * the boot check-in found it down: the back-off draws the delay from up to
 * 60 s after one failure, and from up to 120 s when a second check-in also
 * found the app down, plus a start.
 */
const BACK_OFF_CHECK_IN_MS = 130_000;
/** The step timeout around a wait for a check-in after the back-off. */
const BACK_OFF_STEP_MS = 180_000;
const SAMPLE_EVERY_MS = 25;

interface FlowState {
  config: string;
  secrets: Record<string, string | null>;
  pid: number;
  rss: number;
  heapLimit: number;
}

type Answer = { status: number; body: string } | { error: string };

interface Exit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface RunningSupervisor {
  readonly port: number;
  readonly exited: Promise<Exit>;
  output(): string;
  signal(name: NodeJS.Signals): void;
}

/** How long a swap kept the flow route from answering, by what it answered. */
interface SwapGap {
  /** From the old child's last answer to the new child's first. */
  gapMs: number;
  /** Of the gap: answered 503 (the port server, or a child not loaded yet). */
  unavailableMs: number;
  /**
   * Of the gap: the connection refused, from the new child's start until it
   * listens and from the old child's exit until the supervisor listens.
   */
  refusedMs: number;
  to: FlowState;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A hand-written flow: its route answers the flow's config label, the
 * sha256 of each secret it reads (never a value), its pid, its RSS and its
 * heap limit; `/crash` exits 1. At start it logs each secret value it reads,
 * so the output shows whether the value is masked.
 */
function flowSource(input: {
  config: string;
  names: readonly string[];
  exitBeforeReady?: boolean;
}): string {
  const declared = JSON.stringify({ secrets: [...input.names], env: [] });
  return `import { createHash } from 'node:crypto';
import { getHeapStatistics } from 'node:v8';

export const __walkerosEnv = ${declared};

export default async function (context) {
  ${input.exitBeforeReady ? 'process.exit(1);' : ''}
  const names = __walkerosEnv.secrets;
  for (const name of names)
    if (process.env[name] !== undefined)
      context.logger.handler(
        2,
        'fixture logs the value of ' + name + ' as ' + process.env[name] + ' here',
        {},
        ['fixture'],
        () => {},
      );
  const status = {
    startedAt: Date.now(),
    in: 0,
    out: 0,
    failed: 0,
    sources: {},
    destinations: {},
    dropped: {},
    breakers: {},
    connectionErrors: {},
  };
  const collector = {
    name: 'shop',
    status,
    async push() {
      status.in += 1;
      status.out += 1;
      return { ok: true };
    },
    async command() {
      return { ok: true };
    },
  };
  const hash = (value) =>
    value === undefined ? null : createHash('sha256').update(value).digest('hex');
  const httpHandler = (req, res) => {
    if (req.url === '/crash') process.exit(1);
    status.in += 1;
    status.out += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        config: ${JSON.stringify(input.config)},
        secrets: Object.fromEntries(names.map((name) => [name, hash(process.env[name])])),
        pid: process.pid,
        rss: process.memoryUsage().rss,
        heapLimit: getHeapStatistics().heap_size_limit,
      }),
    );
  };
  return { collector, httpHandler };
}
`;
}

function release(
  sequence: number,
  flow: {
    config: string;
    secretsSince: number;
    app?: string[];
    server?: string[];
    values?: Record<string, string>;
    exitBeforeReady?: boolean;
  },
): Promise<ReleaseFixture> {
  const app = flow.app ?? [];
  const server = flow.server ?? [];
  return buildRelease({
    sequence,
    secrets: { app, server },
    secretsSince: flow.secretsSince,
    values: flow.values,
    source: flowSource({
      config: flow.config,
      names: [...app, ...server],
      exitBeforeReady: flow.exitBeforeReady,
    }),
  });
}

/** The same release with one archive byte changed: same length, other sha256. */
function withOtherArchiveBytes(fixture: ReleaseFixture): ReleaseFixture {
  const archive = new Uint8Array(fixture.archive);
  archive[archive.length >> 1] ^= 0xff;
  return { ...fixture, archive };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port =
        address !== null && typeof address === 'object' ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

/** One GET on a fresh connection, so no socket outlives the child it reached. */
function get(port: number, path: string): Promise<Answer> {
  return new Promise((resolve) => {
    const req = request(
      { host: '127.0.0.1', port, path, method: 'GET', agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString(),
          }),
        );
        res.on('error', (error) => resolve({ error: error.message }));
      },
    );
    req.setTimeout(2000, () => req.destroy(new Error('timeout')));
    req.on('error', (error) => resolve({ error: error.message }));
    req.end();
  });
}

function readState(answer: Answer): FlowState | undefined {
  if (!('status' in answer) || answer.status !== 200) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(answer.body);
  } catch {
    return undefined;
  }
  if (!isObject(value)) return undefined;
  const { config, secrets, pid, rss, heapLimit } = value;
  if (
    typeof config !== 'string' ||
    !isObject(secrets) ||
    typeof pid !== 'number' ||
    typeof rss !== 'number' ||
    typeof heapLimit !== 'number'
  )
    return undefined;
  const hashes: Record<string, string | null> = {};
  for (const [name, hash] of Object.entries(secrets))
    hashes[name] = typeof hash === 'string' ? hash : null;
  return { config, secrets: hashes, pid, rss, heapLimit };
}

/** The release a state belongs to: v2 and v3 share their code, not their value. */
function labelOf(state: FlowState): string {
  return state.config === 'v2' && state.secrets.API_KEY === sha256(APP_VALUE_V3)
    ? 'v3'
    : state.config;
}

/** Measured, never asserted: printed once the run ends. */
const measured: {
  peakRssMb: Record<string, number>;
  heapLimitMb: Record<string, number>;
  extractedBytes: Record<string, number>;
  readyMs: Record<string, number>;
  swaps: Array<{ label: string } & Omit<SwapGap, 'to'>>;
  stopMs: number[];
} = {
  peakRssMb: {},
  heapLimitMb: {},
  extractedBytes: {},
  readyMs: {},
  swaps: [],
  stopMs: [],
};

function note(state: FlowState): void {
  const label = labelOf(state);
  const rssMb = Math.round((state.rss / MIB) * 10) / 10;
  measured.peakRssMb[label] = Math.max(measured.peakRssMb[label] ?? 0, rssMb);
  measured.heapLimitMb[label] = Math.round(state.heapLimit / MIB);
}

async function stateAt(port: number): Promise<FlowState | undefined> {
  const state = readState(await get(port, '/state'));
  if (state) note(state);
  return state;
}

async function waitFor(
  what: string,
  check: () => boolean | Promise<boolean>,
  timeoutMs: number,
): Promise<void> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return;
    if (Date.now() >= end)
      throw new Error(`${what}: not within ${timeoutMs} ms`);
    await sleep(200);
  }
}

async function waitForState(
  what: string,
  port: number,
  isWanted: (state: FlowState) => boolean,
  timeoutMs: number,
): Promise<FlowState> {
  let found: FlowState | undefined;
  await waitFor(
    what,
    async () => {
      const state = await stateAt(port);
      if (state && isWanted(state)) found = state;
      return found !== undefined;
    },
    timeoutMs,
  );
  if (!found) throw new Error(`${what}: no state`);
  return found;
}

/**
 * Samples the flow route every 25 ms until a child other than `from`
 * answers as `isNew` wants, and measures the gap between the two.
 */
async function watchSwap(
  label: string,
  port: number,
  from: FlowState | undefined,
  isNew: (state: FlowState) => boolean,
  timeoutMs: number,
): Promise<SwapGap> {
  const samples: Array<{
    at: number;
    kind: 'old' | 'new' | 'unavailable' | 'refused' | 'other';
  }> = [];
  const startedAt = Date.now();
  let to: FlowState | undefined;
  while (!to) {
    if (Date.now() - startedAt > timeoutMs)
      throw new Error(`${label}: no new child within ${timeoutMs} ms`);
    const at = Date.now();
    const answer = await get(port, '/state');
    const state = readState(answer);
    if (state) note(state);
    if (state && from && state.pid === from.pid)
      samples.push({ at, kind: 'old' });
    else if (state && isNew(state)) {
      samples.push({ at, kind: 'new' });
      to = state;
    } else if ('error' in answer) samples.push({ at, kind: 'refused' });
    else if (answer.status === 503) samples.push({ at, kind: 'unavailable' });
    else samples.push({ at, kind: 'other' });
    if (!to) await sleep(SAMPLE_EVERY_MS);
  }
  let lastOld = -1;
  samples.forEach((sample, index) => {
    if (sample.kind === 'old') lastOld = index;
  });
  const first = Math.max(lastOld, 0);
  const last = samples.length - 1;
  let unavailableMs = 0;
  let refusedMs = 0;
  for (let index = first; index < last; index += 1) {
    const span = samples[index + 1].at - samples[index].at;
    if (samples[index].kind === 'unavailable') unavailableMs += span;
    if (samples[index].kind === 'refused') refusedMs += span;
  }
  const gap: SwapGap = {
    gapMs: samples[last].at - (lastOld >= 0 ? samples[lastOld].at : startedAt),
    unavailableMs,
    refusedMs,
    to,
  };
  measured.swaps.push({
    label,
    gapMs: gap.gapMs,
    unavailableMs,
    refusedMs,
  });
  return gap;
}

async function filesUnder(path: string): Promise<string[]> {
  const info = await stat(path);
  if (!info.isDirectory()) return [path];
  const files: string[] = [];
  for (const name of await readdir(path))
    files.push(...(await filesUnder(join(path, name))));
  return files;
}

async function bytesUnder(path: string): Promise<number> {
  let total = 0;
  for (const file of await filesUnder(path)) total += (await stat(file)).size;
  return total;
}

describe('runneros remote as real processes', () => {
  let root: string;
  let temp: string;
  let cacheDir: string;
  let standIn: StandInApp;
  let port: number;
  let secondPort: number;
  let v1: ReleaseFixture;
  let v2: ReleaseFixture;
  let v3: ReleaseFixture;
  let v4: ReleaseFixture;
  let v5: ReleaseFixture;
  let v6: ReleaseFixture;
  let v7: ReleaseFixture;
  let v8: ReleaseFixture;
  let main: RunningSupervisor;
  let second: RunningSupervisor;
  const runs: Array<RunningSupervisor & { kill(): void }> = [];

  function env(withServerSecret: boolean): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH,
      TMPDIR: temp,
      NODE_OPTIONS: IMAGE_NODE_OPTIONS,
      WALKEROS_APP_URL: standIn.origin,
      WALKEROS_DEPLOYMENT_ID: FIXTURE_DEPLOYMENT,
      WALKEROS_DEPLOY_TOKEN: TOKEN,
      ...(withServerSecret && { RUN_SALT: SERVER_VALUE }),
    };
  }

  function startSupervisor(
    on: number,
    withServerSecret = true,
  ): RunningSupervisor {
    const child = spawn(
      process.execPath,
      [
        BIN,
        'remote',
        '--cache',
        cacheDir,
        '--heap',
        String(HEAP_MB),
        '-p',
        String(on),
      ],
      { env: env(withServerSecret), stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let text = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      text += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      text += chunk.toString();
    });
    const exited = new Promise<Exit>((resolve) =>
      child.once('close', (code, signal) => resolve({ code, signal })),
    );
    const run = {
      port: on,
      exited,
      output: () => text,
      signal: (name: NodeJS.Signals) => {
        child.kill(name);
      },
      kill: () => {
        if (child.exitCode === null && child.signalCode === null)
          child.kill('SIGKILL');
      },
    };
    runs.push(run);
    return run;
  }

  /** The output a supervisor wrote after the first `marker`. */
  function after(run: RunningSupervisor, marker: string): string {
    const text = run.output();
    const at = text.indexOf(marker);
    return at < 0 ? '' : text.slice(at);
  }

  /** SIGTERM, then the exit, or undefined when it does not come within `withinMs`. */
  async function stopped(
    run: RunningSupervisor,
    withinMs: number,
  ): Promise<Exit | undefined> {
    const signalledAt = Date.now();
    run.signal('SIGTERM');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const exit = await Promise.race([
      run.exited,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), withinMs);
      }),
    ]);
    clearTimeout(timer);
    if (exit) measured.stopMs.push(Date.now() - signalledAt);
    return exit;
  }

  async function noteExtraction(sequence: number): Promise<void> {
    for (const name of await readdir(temp)) {
      const folder = join(temp, name, 'releases', String(sequence));
      if (name.startsWith('walkeros-') && existsSync(folder)) {
        measured.extractedBytes[`v${sequence}`] = await bytesUnder(folder);
        return;
      }
    }
  }

  function checkIns() {
    return standIn.requests.filter((entry) => entry.route === 'check-in');
  }

  beforeAll(async () => {
    for (const file of [BIN, CHILD_ENTRY])
      if (!existsSync(file)) throw new Error(`${file} does not exist`);
    root = await mkdtemp(join(tmpdir(), 'walkeros-processes-'));
    temp = join(root, 'tmp');
    cacheDir = join(root, 'cache');
    await mkdir(temp);
    standIn = await startStandInApp({ token: TOKEN });
    port = await freePort();
    secondPort = await freePort();

    v1 = await release(1, { config: 'v1', secretsSince: 1 });
    v2 = await release(2, {
      config: 'v2',
      secretsSince: 2,
      app: ['API_KEY'],
      values: { API_KEY: APP_VALUE_V2 },
    });
    // Secret-only: v2's code, so v2's archive, with a new value.
    v3 = await release(3, {
      config: 'v2',
      secretsSince: 3,
      app: ['API_KEY'],
      values: { API_KEY: APP_VALUE_V3 },
    });
    v4 = withOtherArchiveBytes(
      await release(4, {
        config: 'v4',
        secretsSince: 3,
        app: ['API_KEY'],
        values: { API_KEY: APP_VALUE_V3 },
      }),
    );
    v5 = await release(5, {
      config: 'v5',
      secretsSince: 3,
      app: ['API_KEY'],
      values: { API_KEY: APP_VALUE_V3 },
      exitBeforeReady: true,
    });
    v6 = await release(6, {
      config: 'v6',
      secretsSince: 6,
      exitBeforeReady: true,
    });
    v7 = await release(7, { config: 'v7', secretsSince: 6 });
    v8 = await release(8, {
      config: 'v8',
      secretsSince: 6,
      server: ['RUN_SALT'],
    });
  });

  afterAll(async () => {
    for (const run of runs) run.kill();
    await Promise.all(runs.map((run) => run.exited));
    await standIn?.stop().catch(() => undefined);
    if (root) await rm(root, { recursive: true, force: true });
    console.log(
      `runneros remote process suite, measured:\n${JSON.stringify(measured, null, 2)}`,
    );
  });

  it('1. starts v1 from the app with the heap --heap names over NODE_OPTIONS', async () => {
    standIn.serve(v1, { current: true });
    const forkedAt = Date.now();
    main = startSupervisor(port);
    await waitFor(
      '/ready 200',
      async () => {
        const answer = await get(port, '/ready');
        return 'status' in answer && answer.status === 200;
      },
      POLL_MS,
    );
    const state = await waitForState(
      'v1',
      port,
      (s) => s.config === 'v1',
      POLL_MS,
    );
    measured.readyMs.v1 = Date.now() - forkedAt;
    await noteExtraction(1);

    expect(main.output()).toContain(
      `Heap ${HEAP_MB} MB for the flow, from --heap`,
    );
    expect(state.heapLimit).toBeGreaterThanOrEqual(HEAP_MB * MIB);
    expect(state.heapLimit).toBeLessThan(300 * MIB);
  });

  it(
    '2. swaps to v2, a config release, at the next check-in',
    async () => {
      const from = await stateAt(port);
      standIn.serve(v2, { current: true });
      const swap = await watchSwap(
        'v1 to v2',
        port,
        from,
        (s) => s.config === 'v2',
        CHECK_IN_MS,
      );
      await noteExtraction(2);

      expect(swap.to.secrets.API_KEY).toBe(sha256(APP_VALUE_V2));
    },
    STEP_MS,
  );

  it(
    '3. takes v3, secret-only, without an archive request and masks its value',
    async () => {
      expect(v3.artifact).toEqual(v2.artifact);
      const archivesBefore = standIn.requests.filter(
        (entry) => entry.route === 'archive',
      ).length;
      const from = await stateAt(port);
      standIn.serve(v3, { current: true });
      const swap = await watchSwap(
        'v2 to v3',
        port,
        from,
        (s) => s.secrets.API_KEY === sha256(APP_VALUE_V3),
        CHECK_IN_MS,
      );
      await noteExtraction(3);

      expect(swap.to.config).toBe('v2');
      expect(
        standIn.requests.filter((entry) => entry.route === 'archive').length,
      ).toBe(archivesBefore);
      expect(after(main, 'Release v3 starting')).toContain(
        'fixture logs the value of API_KEY as *** here',
      );
    },
    STEP_MS,
  );

  it(
    '4. refuses v4 with other archive bytes while v3 serves, and reports it',
    async () => {
      const serving = await stateAt(port);
      standIn.serve(v4, { current: true });
      const answers: string[] = [];
      await waitFor(
        'the v4 refusal line',
        async () => {
          const state = await stateAt(port);
          answers.push(state ? labelOf(state) : 'no answer');
          return main.output().includes('Release v4 refused (artifact-sha256)');
        },
        CHECK_IN_MS,
      );
      const seen = standIn.requests.length;
      await waitFor(
        'the check-in after the refusal',
        () =>
          standIn.requests
            .slice(seen)
            .some((entry) => entry.route === 'check-in'),
        CHECK_IN_MS,
      );
      const next = standIn.requests
        .slice(seen)
        .find((entry) => entry.route === 'check-in');
      const body: unknown = JSON.parse(new TextDecoder().decode(next?.body));

      expect(answers.filter((label) => label !== 'v3')).toEqual([]);
      expect((await stateAt(port))?.pid).toBe(serving?.pid);
      expect(body).toMatchObject({
        remote: {
          running: 3,
          last: { sequence: 4, state: 'refused', check: 'artifact-sha256' },
        },
      });
    },
    STEP_MS,
  );

  it(
    '5. refuses v5, which exits before it is ready, and starts v3 again',
    async () => {
      const from = await stateAt(port);
      standIn.serve(v5, { current: true });
      await watchSwap(
        'v3 to v5, refused, to v3',
        port,
        from,
        (s) => labelOf(s) === 'v3',
        CHECK_IN_MS,
      );

      expect(main.output()).toContain(
        'Release v5 exited before it was ready (code 1), refused on this instance',
      );
      expect(main.output()).toContain('Release v3 starting again');
    },
    STEP_MS,
  );

  it(
    '6. holds /ready at 503 when v6, at its own secretsSince, exits before it is ready',
    async () => {
      standIn.serve(v6, { current: true });
      await waitFor(
        'the no-release line',
        () =>
          main
            .output()
            .includes(
              'No release can run: v6 changed secret values and did not start; /ready answers 503',
            ),
        CHECK_IN_MS,
      );
      await waitFor(
        '/ready 503',
        async () => {
          const answer = await get(port, '/ready');
          return 'status' in answer && answer.status === 503;
        },
        POLL_MS,
      );
      const statuses: string[] = [];
      for (let poll = 0; poll < 10; poll += 1) {
        for (const path of ['/ready', '/state']) {
          const answer = await get(port, path);
          statuses.push(
            `${path} ${'status' in answer ? answer.status : answer.error}`,
          );
        }
        await sleep(500);
      }

      expect(main.output()).toContain(
        'Release v6 exited before it was ready (code 1), refused on this instance',
      );
      expect(
        statuses.filter(
          (line) => line !== '/ready 503' && line !== '/state 503',
        ),
      ).toEqual([]);
    },
    STEP_MS,
  );

  it(
    '7. restarts v7 after its flow exits 1',
    async () => {
      standIn.serve(v7, { current: true });
      const running = await waitForState(
        'v7',
        port,
        (s) => s.config === 'v7',
        CHECK_IN_MS,
      );
      await noteExtraction(7);
      const restarted = watchSwap(
        'v7 crash restart',
        port,
        running,
        (s) => s.config === 'v7',
        POLL_MS,
      );
      await get(port, '/crash');
      const swap = await restarted;

      expect(swap.to.pid).not.toBe(running.pid);
      expect(main.output()).toContain(
        'Release v7 exited (code 1), starting it again in 1 s',
      );
    },
    STEP_MS,
  );

  it('8. exits 0 within 10 s on SIGTERM and removes its folder', async () => {
    const exit = await stopped(main, 10_000);

    expect(exit).toEqual({ code: 0, signal: null });
    expect(
      (await readdir(temp)).filter((name) => name.startsWith('walkeros-')),
    ).toEqual([]);
  });

  it('9. boots v7 from the cache with the app down', async () => {
    await standIn.stop();
    const forkedAt = Date.now();
    main = startSupervisor(port);
    await waitForState(
      'v7 from the cache',
      port,
      (s) => s.config === 'v7',
      POLL_MS,
    );
    measured.readyMs['v7 from the cache, app down'] = Date.now() - forkedAt;

    expect(main.output()).toContain('Check-in failed (transport)');
    expect(await stopped(main, 10_000)).toEqual({ code: 0, signal: null });
  });

  it(
    '10. removes a damaged cached archive, refuses v6, then fetches v7 again from the app',
    async () => {
      const archive = join(cacheDir, 'artifacts', `${v7.artifact.sha256}.tgz`);
      const bytes = await readFile(archive);
      bytes[bytes.length >> 1] ^= 0xff;
      await writeFile(archive, bytes);
      main = startSupervisor(port);
      const lines = [
        `Cached artifact sha256 ${v7.artifact.sha256.slice(0, 12)} failed its check and was removed`,
        'Release v6 exited before it was ready (code 1), refused on this instance',
        'No release can run: v6 changed secret values and did not start; /ready answers 503',
      ];
      await waitFor(
        'the removal, refusal and no-release lines',
        () => lines.every((line) => main.output().includes(line)),
        POLL_MS,
      );
      const ready = await get(port, '/ready');
      await standIn.start();
      const seen = standIn.requests.length;
      const forkedAt = Date.now();
      await waitForState(
        'v7 again',
        port,
        (s) => s.config === 'v7',
        BACK_OFF_CHECK_IN_MS,
      );
      measured.readyMs['v7 fetched again'] = Date.now() - forkedAt;

      expect(ready).toMatchObject({ status: 503 });
      expect(
        standIn.requests
          .slice(seen)
          .filter((entry) => entry.route === 'archive')
          .map((entry) => entry.path),
      ).toEqual([expect.stringContaining(v7.document.release)]);
    },
    BACK_OFF_STEP_MS,
  );

  it(
    '11. runs v8 on one supervisor while the other, without its server secret, serves v7, also after a restart',
    async () => {
      second = startSupervisor(secondPort, false);
      await waitForState(
        'v7 on the second',
        secondPort,
        (s) => s.config === 'v7',
        POLL_MS,
      );
      const from = await stateAt(port);
      standIn.serve(v8, { current: true });
      const secondAnswers: string[] = [];
      const refusal = 'Release v8 refused (secret-missing: RUN_SALT)';
      const [swap] = await Promise.all([
        watchSwap(
          'v7 to v8',
          port,
          from,
          (s) => s.config === 'v8',
          CHECK_IN_MS,
        ),
        waitFor(
          'the second refusing v8',
          async () => {
            const state = await stateAt(secondPort);
            secondAnswers.push(state ? labelOf(state) : 'no answer');
            return second.output().includes(refusal);
          },
          CHECK_IN_MS,
        ),
      ]);
      await noteExtraction(8);
      const secondExit = await stopped(second, 10_000);
      second = startSupervisor(secondPort, false);
      await waitFor(
        'the restarted second refusing v8',
        () => second.output().includes(refusal),
        POLL_MS,
      );
      const restarted = await waitForState(
        'v7 on the restarted second',
        secondPort,
        (s) => s.config === 'v7',
        POLL_MS,
      );
      const cached = [
        ...(await readdir(join(cacheDir, 'documents'))),
        ...(await readdir(join(cacheDir, 'artifacts'))),
      ];

      expect(swap.to.secrets.RUN_SALT).toBe(sha256(SERVER_VALUE));
      expect(after(main, 'Release v8 starting')).toContain(
        'fixture logs the value of RUN_SALT as *** here',
      );
      expect(secondAnswers.filter((label) => label !== 'v7')).toEqual([]);
      expect(secondExit).toEqual({ code: 0, signal: null });
      expect(restarted.config).toBe('v7');
      expect(cached).toContain(`${v8.artifact.sha256}.tgz`);
      expect(cached.filter((name) => name.includes('.tmp-'))).toEqual([]);
    },
    STEP_MS,
  );

  it(
    '12. leaves no walkerOS or server value in any output, check-in body or cached file',
    async () => {
      await Promise.all([stopped(main, 10_000), stopped(second, 10_000)]);
      const values = [APP_VALUE_V2, APP_VALUE_V3, SERVER_VALUE];
      const found: string[] = [];
      runs.forEach((run, index) => {
        for (const value of values)
          if (run.output().includes(value))
            found.push(`output ${index}: ${value}`);
      });
      for (const entry of checkIns()) {
        const body = new TextDecoder().decode(entry.body);
        for (const value of values)
          if (body.includes(value)) found.push(`check-in body: ${value}`);
      }
      for (const file of await filesUnder(cacheDir)) {
        const bytes = await readFile(file);
        const texts = [bytes.toString()];
        if (file.endsWith('.tgz')) texts.push(gunzipSync(bytes).toString());
        for (const value of values)
          if (texts.some((text) => text.includes(value)))
            found.push(`${file}: ${value}`);
      }

      expect(checkIns().length).toBeGreaterThan(10);
      expect(found).toEqual([]);
    },
    STEP_MS,
  );
});
