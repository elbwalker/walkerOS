/**
 * The runner's process suite: `runneros remote` as real processes (the fork,
 * IPC, the port hand-over, the cache boot, two supervisors on one cache)
 * against the stand-in app, run from the built dist/. It runs only by its own
 * command, `npm run test:processes` after a build, never in the default test
 * run, in a turbo task or in CI: before a prerelease that changes remote
 * mode, and when working on remote mode. The steps walk one run in order.
 * Restart gaps, web swaps and memory are measured and printed, never
 * asserted.
 *
 * Every supervisor holds only `WALKEROS_CREDENTIAL`, so each app request is
 * signed and the stand-in checks the signature; it seals each walkerOS set
 * to the credential it holds. The flow's ingest writes reach a door on
 * `createDoorCheck` that holds the credential's public signing key.
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
import { createServer as createHttpServer, request } from 'http';
import { createServer, type AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { gunzipSync } from 'zlib';
import {
  isObject,
  type ServedDeployment,
  type ServiceCredential,
} from '@walkeros/core';
import {
  createDoorCheck,
  openSealedSecretSet,
  SIGNATURE_TAGS,
} from '@walkeros/server-core';
import { CLOSED_ISSUER, testCredential } from '../helpers/credential.js';
import {
  buildRelease,
  buildWebRelease,
  FIXTURE_DEPLOYMENT,
  type ReleaseFixture,
  type WebReleaseFixture,
} from '../helpers/release-fixture.js';
import { valuesSealed } from '../helpers/seal.js';
import {
  bodyOf,
  headersOf,
  startStandInApp,
  type StandInApp,
  type StandInRequest,
  type StandInRoute,
} from '../helpers/stand-in-app.js';

const RUNNER = join(__dirname, '..', '..', '..');
const BIN = join(RUNNER, 'dist', 'bin.js');
const CHILD_ENTRY = join(RUNNER, 'dist', 'remote-child.js');

/** The image's own heap setting, which `--heap` must win over. */
const IMAGE_NODE_OPTIONS = '--max-old-space-size=384 --no-warnings';
const HEAP_MB = 200;
const MIB = 1024 * 1024;
const APP_VALUE_V2 = 'plum-orchard-second';
const APP_VALUE_V3 = 'plum-orchard-third';
const APP_VALUE_V7 = 'plum-orchard-seventh';
const SERVER_VALUE = 'harbor-lantern-salt';

/** The web part the served releases list, and where its file lands. */
const WEB_DEPLOYMENT = 'dep_web1';
const WEB_PATH = 'web/walker.js';
const SERVED_ROUTE = `/served/${WEB_PATH}`;

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
/** Longer than the longest check-in interval (30 s + 10 %). */
const SIGNING_MS = 40_000;
const SIGNS_AT_ONCE = 4;

interface FlowState {
  config: string;
  secrets: Record<string, string | null>;
  pid: number;
  rss: number;
  heapLimit: number;
  /** The `WALKEROS_` names the flow sees in its environment; never a value. */
  walkeros: string[];
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

interface Pairing {
  credential: ServiceCredential;
  raw: string;
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

/** A served file replaced while the flow runs: every answer on its route meanwhile. */
interface WebSwap {
  /** Answers other than the old file's bytes or the new file's bytes. */
  others: string[];
}

/** One door decision, by its status and reason. */
interface DoorAnswer {
  status: number;
  reason?: string;
}

interface Door {
  readonly url: string;
  readonly answers: DoorAnswer[];
  close(): Promise<void>;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A web release's script: its sequence in its bytes, so each reads apart. */
function webScript(sequence: number): string {
  return `/* web part w${sequence} */ window.servedSequence = ${sequence};\n`;
}

/**
 * A hand-written flow: its route answers the flow's config label, the
 * sha256 of each secret it reads (never a value), its pid, its RSS, its
 * heap limit and the `WALKEROS_` names it sees; `/crash` exits 1;
 * `/served/<path>` reads `./<path>` from its working folder at each request;
 * `/ingest` signs a POST for the door through `context.authorize` and sends
 * it, answering the door's status; `/sign-app` asks to sign for the app and
 * answers the refusal's message. At start it logs each secret value it
 * reads, so the output shows whether the value is masked.
 */
function flowSource(input: {
  config: string;
  names: readonly string[];
  door: string;
  app: string;
  exitBeforeReady?: boolean;
}): string {
  const declared = JSON.stringify({ secrets: [...input.names], env: [] });
  return `import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getHeapStatistics } from 'node:v8';

export const __walkerosEnv = ${declared};

const DOOR = ${JSON.stringify(input.door)};
const APP = ${JSON.stringify(input.app)};

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
  const text = (res, code, body) => {
    res.writeHead(code, { 'content-type': 'text/plain' });
    res.end(body);
  };
  const ingest = async () => {
    const body = new TextEncoder().encode(JSON.stringify({ name: 'page view', at: Date.now() }));
    const headers = await context.authorize({ method: 'POST', url: DOOR, body });
    const answer = await fetch(DOOR, { method: 'POST', headers, body });
    return answer.status;
  };
  const httpHandler = (req, res) => {
    const url = req.url ?? '/';
    if (url === '/crash') process.exit(1);
    if (url.startsWith('/served/')) {
      readFile('./' + url.slice('/served/'.length)).then(
        (bytes) => {
          res.writeHead(200, { 'content-type': 'text/javascript' });
          res.end(bytes);
        },
        () => text(res, 404, 'not served'),
      );
      return;
    }
    if (url === '/ingest') {
      ingest().then(
        (code) => text(res, code, 'door ' + code),
        (error) => text(res, 500, error.message),
      );
      return;
    }
    if (url === '/sign-app') {
      context
        .authorize({ method: 'POST', url: APP + '/api/runner/check-in', body: new Uint8Array(0) })
        .then(
          () => text(res, 200, 'signed'),
          (error) => text(res, 200, error.message),
        );
      return;
    }
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
        walkeros: Object.keys(process.env).filter((name) => name.startsWith('WALKEROS_')),
      }),
    );
  };
  return { collector, httpHandler };
}
`;
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

/**
 * A data plane's door on `createDoorCheck`, holding the public signing key
 * of the pairing `held` answers at each request: 200 for a request it
 * passes, else the decision's status, and 500 when the check throws.
 */
async function startDoor(held: () => Pairing): Promise<Door> {
  const answers: DoorAnswer[] = [];
  const check = createDoorCheck({
    tag: SIGNATURE_TAGS.ingest,
    lookup: async (keyid) => {
      const { kid, kty, crv, x, y } = held().credential.sig;
      return keyid === kid ? { kty, crv, x, y } : undefined;
    },
    startedAt: Date.now(),
  });
  let origin = '';
  const server = createHttpServer((req, res) => {
    void bodyOf(req)
      .then((body) =>
        check.check({
          origin,
          method: req.method ?? '',
          target: req.url ?? '/',
          headers: headersOf(req.headers),
          body,
        }),
      )
      .then((decision) => {
        const answer: DoorAnswer = decision.ok
          ? { status: 200 }
          : { status: decision.status, reason: decision.reason };
        answers.push(answer);
        res.writeHead(answer.status);
        res.end();
      })
      // A body read or a check that throws answers 500 with its reason,
      // so a row sees the cause, not a client timeout.
      .catch((error: unknown) => {
        answers.push({
          status: 500,
          reason: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(500);
        res.end();
      });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  const address: AddressInfo | string | null = server.address();
  const port =
    address !== null && typeof address === 'object' ? address.port : 0;
  origin = `http://127.0.0.1:${port}`;
  return {
    url: `${origin}/ingest`,
    answers,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
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

function answerText(answer: Answer): string {
  return 'status' in answer ? String(answer.status) : answer.error;
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
  const { config, secrets, pid, rss, heapLimit, walkeros } = value;
  if (
    typeof config !== 'string' ||
    !isObject(secrets) ||
    typeof pid !== 'number' ||
    typeof rss !== 'number' ||
    typeof heapLimit !== 'number' ||
    !Array.isArray(walkeros)
  )
    return undefined;
  const hashes: Record<string, string | null> = {};
  for (const [name, hash] of Object.entries(secrets))
    hashes[name] = typeof hash === 'string' ? hash : null;
  const names = walkeros.filter(
    (name): name is string => typeof name === 'string',
  );
  return { config, secrets: hashes, pid, rss, heapLimit, walkeros: names };
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
  webSwaps: Array<{
    label: string;
    ms: number;
    samples: number;
    others: number;
  }>;
  signing: {
    ingests: number;
    doorAnswers: Record<string, number>;
    /** When each check-in came, from the start of the signing. */
    checkInsAtMs: number[];
  };
  stopMs: number[];
} = {
  peakRssMb: {},
  heapLimitMb: {},
  extractedBytes: {},
  readyMs: {},
  swaps: [],
  webSwaps: [],
  signing: { ingests: 0, doorAnswers: {}, checkInsAtMs: [] },
  stopMs: [],
};

/** Every `WALKEROS_` name any flow reported seeing. */
const walkerosNamesSeen = new Set<string>();

function note(state: FlowState): void {
  const label = labelOf(state);
  const rssMb = Math.round((state.rss / MIB) * 10) / 10;
  measured.peakRssMb[label] = Math.max(measured.peakRssMb[label] ?? 0, rssMb);
  measured.heapLimitMb[label] = Math.round(state.heapLimit / MIB);
  for (const name of state.walkeros) walkerosNamesSeen.add(name);
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

/**
 * Samples the served file's route every 25 ms until it answers `to`, and
 * keeps every answer that is neither `from` nor `to`.
 */
async function watchWebSwap(
  label: string,
  port: number,
  file: { from: string; to: string },
  timeoutMs: number,
): Promise<WebSwap> {
  const startedAt = Date.now();
  const others: string[] = [];
  let samples = 0;
  for (;;) {
    if (Date.now() - startedAt > timeoutMs)
      throw new Error(`${label}: the new file not within ${timeoutMs} ms`);
    const answer = await get(port, SERVED_ROUTE);
    samples += 1;
    const body = 'status' in answer && answer.status === 200 ? answer.body : '';
    if (body === file.to) break;
    if (body !== file.from) others.push(answerText(answer));
    await sleep(SAMPLE_EVERY_MS);
  }
  measured.webSwaps.push({
    label,
    ms: Date.now() - startedAt,
    samples,
    others: others.length,
  });
  return { others };
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

/** A check-in body as the stand-in recorded it. */
function bodyJson(entry: StandInRequest): unknown {
  return JSON.parse(new TextDecoder().decode(entry.body));
}

/** Whether a check-in body reports the running release's web parts. */
function reportsServed(body: unknown): boolean {
  return (
    isObject(body) && isObject(body.remote) && isObject(body.remote.served)
  );
}

describe('runneros remote as real processes', () => {
  let root: string;
  let temp: string;
  let cacheDir: string;
  /** The fresh caches of the served steps: the main one, then two more. */
  let webCache: string;
  let secondWebCache: string;
  let thirdWebCache: string;
  let standIn: StandInApp;
  let door: Door;
  /** The pairing the stand-in holds now; a new one from step 10 on. */
  let paired: Pairing;
  const pairings: Pairing[] = [];
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
  let v9: ReleaseFixture;
  let otherDeployment: ReleaseFixture;
  let belowHighWater: ReleaseFixture;
  let secretInEnv: ReleaseFixture;
  let v12: ReleaseFixture;
  let v13: ReleaseFixture;
  let w1: WebReleaseFixture;
  let w2: WebReleaseFixture;
  let w3: WebReleaseFixture;
  let main: RunningSupervisor;
  let second: RunningSupervisor;
  /** 16f's held answer to the w3 file, and the child that serves meanwhile. */
  let releaseHeldFile: () => void = () => {};
  let servingWhileHeld: FlowState | undefined;
  const runs: Array<RunningSupervisor & { kill(): void }> = [];

  function release(
    sequence: number,
    flow: {
      config: string;
      secretsSince: number;
      deployment?: string;
      app?: string[];
      server?: string[];
      values?: Record<string, string>;
      exitBeforeReady?: boolean;
      files?: Record<string, string>;
      served?: ServedDeployment[];
    },
  ): Promise<ReleaseFixture> {
    const app = flow.app ?? [];
    const server = flow.server ?? [];
    return buildRelease({
      sequence,
      deployment: flow.deployment,
      secrets: { app, server },
      secretsSince: flow.secretsSince,
      values: flow.values,
      files: flow.files,
      served: flow.served,
      source: flowSource({
        config: flow.config,
        names: [...app, ...server],
        door: door.url,
        app: standIn.origin,
        exitBeforeReady: flow.exitBeforeReady,
      }),
    });
  }

  function webRelease(sequence: number): WebReleaseFixture {
    return buildWebRelease({
      deployment: WEB_DEPLOYMENT,
      sequence,
      script: webScript(sequence),
    });
  }

  function env(withServerSecret: boolean): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH,
      TMPDIR: temp,
      NODE_OPTIONS: IMAGE_NODE_OPTIONS,
      WALKEROS_CREDENTIAL: paired.raw,
      ...(withServerSecret && { RUN_SALT: SERVER_VALUE }),
    };
  }

  function startSupervisor(
    on: number,
    options: { serverSecret?: boolean; cache?: string } = {},
  ): RunningSupervisor {
    const child = spawn(
      process.execPath,
      [
        BIN,
        'remote',
        '--cache',
        options.cache ?? cacheDir,
        '--heap',
        String(HEAP_MB),
        '-p',
        String(on),
      ],
      {
        env: env(options.serverSecret ?? true),
        stdio: ['ignore', 'pipe', 'pipe'],
      },
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

  /** The cached sealed sets of a pairing, by file name. */
  async function sealedSets(pairing: Pairing): Promise<string[]> {
    const folder = join(cacheDir, 'secrets', pairing.credential.enc.kid);
    return existsSync(folder) ? (await readdir(folder)).sort() : [];
  }

  beforeAll(async () => {
    for (const file of [BIN, CHILD_ENTRY])
      if (!existsSync(file)) throw new Error(`${file} does not exist`);
    root = await mkdtemp(join(tmpdir(), 'walkeros-processes-'));
    temp = join(root, 'tmp');
    cacheDir = join(root, 'cache');
    webCache = join(root, 'web-cache');
    secondWebCache = join(root, 'second-web-cache');
    thirdWebCache = join(root, 'third-web-cache');
    await mkdir(temp);
    standIn = await startStandInApp();
    paired = await standIn.pair();
    pairings.push(paired);
    door = await startDoor(() => paired);
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
    // Its walkerOS secret is sealed to whichever pairing the stand-in holds.
    v7 = await release(7, {
      config: 'v7',
      secretsSince: 6,
      app: ['API_KEY'],
      values: { API_KEY: APP_VALUE_V7 },
    });
    v8 = await release(8, {
      config: 'v8',
      secretsSince: 6,
      app: ['API_KEY'],
      server: ['RUN_SALT'],
      values: { API_KEY: APP_VALUE_V7 },
    });
    v9 = await release(9, {
      config: 'v9',
      secretsSince: 6,
      app: ['API_KEY'],
      values: { API_KEY: APP_VALUE_V7 },
      exitBeforeReady: true,
    });
    otherDeployment = await release(10, {
      config: 'v10',
      secretsSince: 6,
      deployment: 'dep_other',
    });
    belowHighWater = await release(5, { config: 'v5b', secretsSince: 3 });
    secretInEnv = await release(11, {
      config: 'v11',
      secretsSince: 6,
      app: ['RUN_SALT'],
    });

    w1 = webRelease(1);
    w2 = webRelease(2);
    w3 = webRelease(3);
    const served: ServedDeployment[] = [
      { deployment: WEB_DEPLOYMENT, path: WEB_PATH, sequence: 1 },
    ];
    v12 = await release(12, {
      config: 'v12',
      secretsSince: 6,
      files: { [WEB_PATH]: webScript(1) },
      served,
    });
    v13 = await release(13, {
      config: 'v13',
      secretsSince: 6,
      files: { [WEB_PATH]: webScript(1) },
      served,
    });
  });

  afterAll(async () => {
    for (const run of runs) run.kill();
    await Promise.all(runs.map((run) => run.exited));
    await standIn?.stop().catch(() => undefined);
    await door?.close().catch(() => undefined);
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
    '2. swaps to v2, a config release, at the next check-in, its walkerOS value sealed in the cache',
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
      const sealed = await readFile(
        join(cacheDir, 'secrets', paired.credential.enc.kid, '2.jwe'),
      );
      const opened = await openSealedSecretSet(new Uint8Array(sealed), {
        key: paired.credential.enc,
        deployment: FIXTURE_DEPLOYMENT,
        sequence: 2,
      });

      expect(swap.to.secrets.API_KEY).toBe(sha256(APP_VALUE_V2));
      expect(opened).toEqual({ API_KEY: APP_VALUE_V2 });
      expect(sealed.toString('latin1')).not.toContain(APP_VALUE_V2);
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
      const body: unknown = next ? bodyJson(next) : undefined;

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
          statuses.push(`${path} ${answerText(answer)}`);
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
      expect(swap.to.secrets.API_KEY).toBe(sha256(APP_VALUE_V7));
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

  it('9. boots v7 from the cache with the app down, its walkerOS value opened from the sealed cache', async () => {
    await standIn.stop();
    const seen = standIn.requests.length;
    const forkedAt = Date.now();
    main = startSupervisor(port);
    const state = await waitForState(
      'v7 from the cache',
      port,
      (s) => s.config === 'v7',
      POLL_MS,
    );
    measured.readyMs['v7 from the cache, app down'] = Date.now() - forkedAt;

    expect(state.secrets.API_KEY).toBe(sha256(APP_VALUE_V7));
    expect(main.output()).toContain('Check-in failed (transport)');
    // Pins that the stand-in is down: a closed listener records nothing.
    expect(standIn.requests.length).toBe(seen);
    expect(await stopped(main, 10_000)).toEqual({ code: 0, signal: null });
  });

  it(
    '10. a new pairing on the same cache waits for the app for v7, then caches its set under its own key id',
    async () => {
      const first = paired;
      paired = await testCredential('deployment', {
        resource: `${standIn.origin}/api`,
        iss: CLOSED_ISSUER,
        id: FIXTURE_DEPLOYMENT,
      });
      pairings.push(paired);
      main = startSupervisor(port);
      const lines = [
        'Release v6 exited before it was ready (code 1), refused on this instance',
        'No release can run: the walkerOS secrets of v7 need the app; /ready answers 503',
      ];
      await waitFor(
        'the refusal and waiting lines',
        () => lines.every((line) => main.output().includes(line)),
        POLL_MS,
      );
      const ready = await get(port, '/ready');
      standIn.setCredential(paired.credential);
      await standIn.start();
      const forkedAt = Date.now();
      const state = await waitForState(
        'v7 with the new pairing',
        port,
        (s) => s.config === 'v7',
        BACK_OFF_CHECK_IN_MS,
      );
      measured.readyMs['v7 after a new pairing'] = Date.now() - forkedAt;

      expect(ready).toMatchObject({ status: 503 });
      expect(state.secrets.API_KEY).toBe(sha256(APP_VALUE_V7));
      expect(paired.credential.enc.kid).not.toBe(first.credential.enc.kid);
      expect(await sealedSets(first)).toContain('7.jwe');
      expect(await sealedSets(paired)).toEqual(['7.jwe']);
    },
    BACK_OFF_STEP_MS,
  );

  it(
    '11. removes a damaged cached archive, refuses v6, then fetches v7 again from the app',
    async () => {
      await stopped(main, 10_000);
      await standIn.stop();
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
      // Its walkerOS set opens from the second key's cache, as row 10 left it.
      expect(
        standIn.requests
          .slice(seen)
          .filter((entry) => entry.route === 'secrets'),
      ).toEqual([]);
    },
    BACK_OFF_STEP_MS,
  );

  it(
    '12. runs v8 on one supervisor while the other, without its server secret, serves v7, also after a restart',
    async () => {
      second = startSupervisor(secondPort, { serverSecret: false });
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
      second = startSupervisor(secondPort, { serverSecret: false });
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
      const restartedExit = await stopped(second, 10_000);

      expect(swap.to.secrets).toEqual({
        API_KEY: sha256(APP_VALUE_V7),
        RUN_SALT: sha256(SERVER_VALUE),
      });
      expect(after(main, 'Release v8 starting')).toContain(
        'fixture logs the value of RUN_SALT as *** here',
      );
      expect(secondAnswers.filter((label) => label !== 'v7')).toEqual([]);
      expect(secondExit).toEqual({ code: 0, signal: null });
      expect(restarted.config).toBe('v7');
      expect(restartedExit).toEqual({ code: 0, signal: null });
      expect(cached).toContain(`${v8.artifact.sha256}.tgz`);
      expect(cached.filter((name) => name.includes('.tmp-'))).toEqual([]);
      expect(await sealedSets(paired)).toEqual(['7.jwe', '8.jwe']);
    },
    STEP_MS,
  );

  it(
    '13. falls back from v9 to v8 on a cold boot with the app down, opening v8 from the sealed cache',
    async () => {
      const from = await stateAt(port);
      standIn.serve(v9, { current: true });
      await watchSwap(
        'v8 to v9, refused, to v8',
        port,
        from,
        (s) => s.config === 'v8',
        CHECK_IN_MS,
      );
      const refusedOnce = main.output();
      await stopped(main, 10_000);
      await standIn.stop();
      const forkedAt = Date.now();
      main = startSupervisor(port);
      const state = await waitForState(
        'v8 from the cache',
        port,
        (s) => s.config === 'v8',
        POLL_MS,
      );
      measured.readyMs['v8 after v9 on a cold boot, app down'] =
        Date.now() - forkedAt;
      // The walk goes on with the app up: its check-ins answer again.
      await standIn.start();

      expect(refusedOnce).toContain(
        'Release v9 exited before it was ready (code 1), refused on this instance',
      );
      expect(refusedOnce).toContain('Release v8 starting again');
      expect(main.output()).toContain(
        'Release v9 exited before it was ready (code 1), refused on this instance',
      );
      expect(state.secrets).toEqual({
        API_KEY: sha256(APP_VALUE_V7),
        RUN_SALT: sha256(SERVER_VALUE),
      });
      expect(await sealedSets(paired)).toEqual(['7.jwe', '8.jwe', '9.jwe']);
    },
    STEP_MS,
  );

  it.each<[string, () => ReleaseFixture, string]>([
    [
      'a document naming another deployment',
      () => otherDeployment,
      'Release v10 refused (deployment)',
    ],
    [
      'a sequence below v9',
      () => belowHighWater,
      'Release v5 refused (sequence)',
    ],
    [
      "a walkerOS secret whose name the supervisor's environment sets",
      () => secretInEnv,
      'Release v11 refused (secret-in-env: RUN_SALT)',
    ],
  ])(
    '14. refuses %s at a swap, v8 serving on',
    async (_what, fixture, line) => {
      const serving = await stateAt(port);
      standIn.serve(fixture(), { current: true });
      const answers: string[] = [];
      await waitFor(
        line,
        async () => {
          const state = await stateAt(port);
          answers.push(
            state ? `${labelOf(state)} pid ${state.pid}` : 'no answer',
          );
          return main.output().includes(line);
        },
        BACK_OFF_CHECK_IN_MS,
      );

      expect(
        answers.filter((answer) => answer !== `v8 pid ${serving?.pid}`),
      ).toEqual([]);
    },
    BACK_OFF_STEP_MS,
  );

  it('15. signs the flow ingest write for a door and refuses to sign for the app', async () => {
    const ingest = await get(port, '/ingest');
    const app = await get(port, '/sign-app');

    expect(ingest).toEqual({ status: 200, body: 'door 200' });
    expect(door.answers).toEqual([{ status: 200 }]);
    expect(app).toEqual({
      status: 200,
      body: 'The door signer does not sign for the app or its auth server',
    });
  });

  it(
    '15b. keeps its check-in schedule while the child signs',
    async () => {
      const marker = main.output().length;
      const startedAt = Date.now();
      let known = checkIns().length;
      const checkInsAt: number[] = [];
      const answers: string[] = [];
      while (Date.now() - startedAt < SIGNING_MS) {
        const batch = await Promise.all(
          Array.from({ length: SIGNS_AT_ONCE }, () => get(port, '/ingest')),
        );
        answers.push(...batch.map(answerText));
        const count = checkIns().length;
        for (; known < count; known += 1)
          checkInsAt.push(Date.now() - startedAt);
        await sleep(SAMPLE_EVERY_MS);
      }
      measured.signing.ingests = answers.length;
      for (const answer of door.answers) {
        const key = `${answer.status}${answer.reason ? ` ${answer.reason}` : ''}`;
        measured.signing.doorAnswers[key] =
          (measured.signing.doorAnswers[key] ?? 0) + 1;
      }
      measured.signing.checkInsAtMs = checkInsAt;

      expect(answers.filter((answer) => answer !== '200')).toEqual([]);
      expect(checkInsAt.length).toBeGreaterThanOrEqual(1);
      expect(main.output().slice(marker)).not.toContain('Check-in failed');
    },
    STEP_MS,
  );

  it(
    '16a. on a fresh empty cache serves the archive web file while its route fails, and reports it',
    async () => {
      await stopped(main, 10_000);
      standIn.serveWeb(w1, { current: true });
      standIn.setAnswer('served-file', { status: 503 });
      standIn.serve(v12, { current: true });
      main = startSupervisor(port, { cache: webCache });
      await waitForState('v12', port, (s) => s.config === 'v12', CHECK_IN_MS);
      await waitFor(
        'the not-fetched line',
        () =>
          main
            .output()
            .includes(`Served file ${WEB_PATH} v1 not fetched (503)`),
        POLL_MS,
      );
      const file = await get(port, SERVED_ROUTE);
      const seen = standIn.requests.length;
      await waitFor(
        'a check-in reporting the web part',
        () =>
          standIn.requests
            .slice(seen)
            .some(
              (entry) =>
                entry.route === 'check-in' && reportsServed(bodyJson(entry)),
            ),
        CHECK_IN_MS,
      );
      const report = standIn.requests
        .slice(seen)
        .find(
          (entry) =>
            entry.route === 'check-in' && reportsServed(bodyJson(entry)),
        );

      expect(file).toEqual({ status: 200, body: webScript(1) });
      expect(report ? bodyJson(report) : undefined).toMatchObject({
        remote: {
          running: 12,
          served: { [WEB_DEPLOYMENT]: { running: 1, last: null } },
        },
      });
    },
    STEP_MS,
  );

  it(
    '16b. caches w1 at the next check-in once its route answers, the file staying w1 bytes',
    async () => {
      const serving = await stateAt(port);
      standIn.setAnswer('served-file', undefined);
      await waitFor(
        'the w1 placed line',
        () =>
          main
            .output()
            .includes(
              `Served file ${WEB_PATH} v1 placed (sha256 ${w1.artifact.sha256.slice(0, 12)})`,
            ),
        CHECK_IN_MS,
      );

      expect(await get(port, SERVED_ROUTE)).toEqual({
        status: 200,
        body: webScript(1),
      });
      expect((await stateAt(port))?.pid).toBe(serving?.pid);
      expect(await readdir(join(webCache, 'artifacts'))).toContain(
        `${w1.artifact.sha256}.js`,
      );
    },
    STEP_MS,
  );

  it(
    '16c. places w2 with no restart',
    async () => {
      const serving = await stateAt(port);
      const marker = main.output().length;
      standIn.serveWeb(w2, { current: true });
      const swap = await watchWebSwap(
        'w1 to w2',
        port,
        { from: webScript(1), to: webScript(2) },
        CHECK_IN_MS,
      );
      const placed = `Served file ${WEB_PATH} v2 placed (sha256 ${w2.artifact.sha256.slice(0, 12)}, was v1)`;
      await waitFor(
        'the w2 placed line',
        () => main.output().slice(marker).includes(placed),
        POLL_MS,
      );

      expect(swap.others).toEqual([]);
      expect((await stateAt(port))?.pid).toBe(serving?.pid);
      expect(main.output().slice(marker)).not.toMatch(/Release v\d+/);
    },
    STEP_MS,
  );

  it(
    '16d. serves w2 after a crash restart',
    async () => {
      const running = await stateAt(port);
      const restarted = watchSwap(
        'v12 crash restart with w2 placed',
        port,
        running,
        (s) => s.config === 'v12',
        POLL_MS,
      );
      await get(port, '/crash');
      const swap = await restarted;

      expect(swap.to.pid).not.toBe(running?.pid);
      expect(await get(port, SERVED_ROUTE)).toEqual({
        status: 200,
        body: webScript(2),
      });
    },
    STEP_MS,
  );

  it(
    '16e. takes v13, the same listing with a config change, serving w2',
    async () => {
      const from = await stateAt(port);
      standIn.serve(v13, { current: true });
      await watchSwap(
        'v12 to v13 with w2 placed',
        port,
        from,
        (s) => s.config === 'v13',
        CHECK_IN_MS,
      );

      expect(await get(port, SERVED_ROUTE)).toEqual({
        status: 200,
        body: webScript(2),
      });
    },
    STEP_MS,
  );

  it(
    '16f. restarted on its cache while the w3 file hangs, serves w2 at once',
    async () => {
      await stopped(main, 10_000);
      releaseHeldFile = standIn.hold('served-file');
      standIn.serveWeb(w3, { current: true });
      const seen = standIn.requests.length;
      main = startSupervisor(port, { cache: webCache });
      servingWhileHeld = await waitForState(
        'v13 from its cache',
        port,
        (s) => s.config === 'v13',
        POLL_MS,
      );
      await waitFor(
        'the held w3 file request',
        () =>
          standIn.requests
            .slice(seen)
            .some((entry) => entry.route === 'served-file'),
        POLL_MS,
      );

      expect(await get(port, SERVED_ROUTE)).toEqual({
        status: 200,
        body: webScript(2),
      });
    },
    STEP_MS,
  );

  it('16f, signing. signs the flow ingest write while the web consider waits in the serial chain for the held w3 file', async () => {
    // A sign queued behind that consider would not answer within 2 s.
    expect(await get(port, '/ingest')).toEqual({
      status: 200,
      body: 'door 200',
    });
  });

  it(
    '16f, placing. places w3 with no restart once the held file comes',
    async () => {
      releaseHeldFile();
      const swap = await watchWebSwap(
        'w2 to w3 after a restart',
        port,
        { from: webScript(2), to: webScript(3) },
        POLL_MS,
      );

      expect(swap.others).toEqual([]);
      expect((await stateAt(port))?.pid).toBe(servingWhileHeld?.pid);
    },
    STEP_MS,
  );

  it(
    '16g. a second supervisor on another fresh empty cache serves the current web file at its first request',
    async () => {
      const startedAt = Date.now();
      second = startSupervisor(secondPort, { cache: secondWebCache });
      let first: Answer | undefined;
      await waitFor(
        'the first answer of the served file',
        async () => {
          const answer = await get(secondPort, SERVED_ROUTE);
          if ('status' in answer && answer.status === 200) first = answer;
          return first !== undefined;
        },
        CHECK_IN_MS,
      );
      measured.readyMs['v13 on an empty cache, the web file prompt'] =
        Date.now() - startedAt;
      const exit = await stopped(second, 10_000);

      expect(first).toEqual({ status: 200, body: webScript(3) });
      expect(second.output()).toContain(
        `Served file ${WEB_PATH} v3 placed (sha256 ${w3.artifact.sha256.slice(0, 12)})`,
      );
      expect(exit).toEqual({ code: 0, signal: null });
    },
    STEP_MS,
  );

  it(
    '16h. on another fresh empty cache while w3 hangs, forks at the cap with the archive web file, then places w3 with no restart',
    async () => {
      const release = standIn.hold('served-file');
      const seen = standIn.requests.length;
      const startedAt = Date.now();
      second = startSupervisor(secondPort, { cache: thirdWebCache });
      const state = await waitForState(
        'v13 on the second',
        secondPort,
        (s) => s.config === 'v13',
        CHECK_IN_MS,
      );
      measured.readyMs['v13 on an empty cache, the web file held'] =
        Date.now() - startedAt;
      await waitFor(
        'the held w3 file request',
        () =>
          standIn.requests
            .slice(seen)
            .some((entry) => entry.route === 'served-file'),
        POLL_MS,
      );
      const whileHeld = await get(secondPort, SERVED_ROUTE);
      release();
      const swap = await watchWebSwap(
        'archive w1 to w3 on an empty cache',
        secondPort,
        { from: webScript(1), to: webScript(3) },
        POLL_MS,
      );
      const pid = (await stateAt(secondPort))?.pid;
      const exit = await stopped(second, 10_000);

      expect(whileHeld).toEqual({ status: 200, body: webScript(1) });
      expect(swap.others).toEqual([]);
      expect(pid).toBe(state.pid);
      expect(exit).toEqual({ code: 0, signal: null });
    },
    STEP_MS,
  );

  it(
    '17. on a revocation writes the refused lines once and serves on',
    async () => {
      const serving = await stateAt(port);
      const marker = main.output().length;
      const routes: StandInRoute[] = [
        'check-in',
        'release',
        'archive',
        'secrets',
        'served-release',
        'served-file',
      ];
      for (const route of routes)
        standIn.setAnswer(route, {
          status: 401,
          headers: { 'www-authenticate': 'DPoP algs="ES256"' },
        });
      const answers: string[] = [];
      const poll = async () => {
        const state = await stateAt(port);
        answers.push(state ? `pid ${state.pid}` : 'no answer');
      };
      await waitFor(
        'the refused check-in line',
        async () => {
          await poll();
          return main
            .output()
            .slice(marker)
            .includes(
              'Check-in refused (401), serving on; next check-in in 5 min',
            );
        },
        CHECK_IN_MS,
      );
      for (let count = 0; count < 10; count += 1) {
        await poll();
        await sleep(500);
      }
      const lines = main.output().slice(marker);

      expect(
        answers.filter((answer) => answer !== `pid ${serving?.pid}`),
      ).toEqual([]);
      expect(
        lines.split("The app refused this runner's signed request (HTTP 401)")
          .length - 1,
      ).toBe(1);
    },
    STEP_MS,
  );

  it(
    '18. leaves no value or credential in any output, check-in body or cached file, and no WALKEROS_ name in a flow',
    async () => {
      // The second supervisor stopped in 16h.
      await stopped(main, 10_000);
      // Each by a name of its own, so a finding never prints a secret.
      const secrets: Array<[string, string]> = [
        ...valuesSealed().map((value, index): [string, string] => [
          `walkerOS value ${index + 1}`,
          value,
        ]),
        ['the server value', SERVER_VALUE],
        ...pairings.flatMap(
          (pairing, index): Array<[string, string]> => [
            [`credential ${index + 1}`, pairing.raw],
            [`credential ${index + 1} signing key`, pairing.credential.sig.d],
            [
              `credential ${index + 1} encryption key`,
              pairing.credential.enc.d,
            ],
          ],
        ),
      ];
      const found: string[] = [];
      runs.forEach((run, index) => {
        for (const [name, secret] of secrets)
          if (run.output().includes(secret))
            found.push(`output ${index}: ${name}`);
      });
      for (const entry of checkIns()) {
        const body = new TextDecoder().decode(entry.body);
        for (const [name, secret] of secrets)
          if (body.includes(secret)) found.push(`check-in body: ${name}`);
      }
      for (const folder of [cacheDir, webCache, secondWebCache, thirdWebCache])
        for (const file of await filesUnder(folder)) {
          const bytes = await readFile(file);
          const texts = [bytes.toString('latin1')];
          if (file.endsWith('.tgz'))
            texts.push(gunzipSync(bytes).toString('latin1'));
          for (const [name, secret] of secrets)
            if (texts.some((text) => text.includes(secret)))
              found.push(`${file}: ${name}`);
        }

      expect(valuesSealed()).toEqual(
        expect.arrayContaining([APP_VALUE_V2, APP_VALUE_V3, APP_VALUE_V7]),
      );
      expect(checkIns().length).toBeGreaterThan(10);
      expect(found).toEqual([]);
      expect([...walkerosNamesSeen]).toEqual([]);
    },
    STEP_MS,
  );
});
