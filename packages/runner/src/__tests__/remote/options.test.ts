import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { createKnownValues } from '@walkeros/core/node';
import { ChannelError } from '@walkeros/server-core';
import { resetProcessGuardsForTest } from '../../pipeline.js';
import { appLinkFromEnvironment, type AppLink } from '../../remote/app-link.js';
import { createReleaseCache, type ReleaseCache } from '../../remote/cache.js';
import {
  bootCheckInMs,
  checkInOutcomeLines,
  postCheckIn,
  remoteCheckInLoop,
  runRemote,
} from '../../remote/command.js';
import { TEST_ISSUER, testCredential } from '../helpers/credential.js';
import { createMockLogger } from '../helpers/mock-logger.js';
import {
  buildRelease,
  FIXTURE_DEPLOYMENT,
} from '../helpers/release-fixture.js';
import { recordingLogger, type Line } from '../helpers/supervisor-harness.js';
import { startStandInApp } from '../helpers/stand-in-app.js';
import {
  resolveRemoteOptions,
  type RemoteFlags,
  type RemoteOptions,
} from '../../remote/options.js';

describe('resolveRemoteOptions', () => {
  const flags: RemoteFlags = { cache: '/var/cache/walkeros', heartbeat: true };

  it.each<[string, RemoteFlags, NodeJS.ProcessEnv, RemoteOptions | string]>([
    [
      'the flags as given',
      { ...flags, heap: '200', port: 3000, json: true },
      {},
      {
        cacheDir: '/var/cache/walkeros',
        heartbeat: true,
        heapMb: 200,
        port: 3000,
        json: true,
      },
    ],
    [
      'the port from PORT without -p',
      flags,
      { PORT: '9001' },
      { cacheDir: '/var/cache/walkeros', heartbeat: true, port: 9001 },
    ],
    [
      'port 8080 without either',
      { ...flags, heartbeat: false },
      {},
      { cacheDir: '/var/cache/walkeros', heartbeat: false, port: 8080 },
    ],
    [
      'the cache folder as an absolute path',
      { ...flags, cache: 'cache' },
      {},
      { cacheDir: resolve('cache'), heartbeat: true, port: 8080 },
    ],
    [
      'BUNDLE in the environment ignored',
      flags,
      { BUNDLE: '/app/flow/flow.mjs' },
      { cacheDir: '/var/cache/walkeros', heartbeat: true, port: 8080 },
    ],
    ['no --cache', { heartbeat: true }, {}, '--cache is not set'],
    [
      '--heap below 64',
      { ...flags, heap: '63' },
      {},
      '--heap 63 is below the 64 MB minimum',
    ],
    [
      '--heap not a number',
      { ...flags, heap: 'x' },
      {},
      '--heap x is not a whole number of MB',
    ],
  ])('reads %s', (_name, given, env, expected) => {
    if (typeof expected === 'string')
      expect(() => resolveRemoteOptions(given, env)).toThrow(expected);
    else expect(resolveRemoteOptions(given, env)).toEqual(expected);
  });

  it('reads no env file, whatever the flags carry', () => {
    const folder = mkdtempSync(join(tmpdir(), 'walkeros-remote-options-'));
    try {
      const file = join(folder, '.env');
      writeFileSync(file, 'REMOTE_OPTIONS_PROBE=from-file\n', { mode: 0o600 });
      const given = { ...flags, envFile: file };
      const env: NodeJS.ProcessEnv = {};

      resolveRemoteOptions(given, env);

      expect(process.env.REMOTE_OPTIONS_PROBE).toBeUndefined();
      expect(env).toEqual({});
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});

describe('the check-in loop after the boot check-in', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('holds the next check-in for the refused hold after a boot 401, with one line', async () => {
    jest.useFakeTimers();
    const lines: Line[] = [];
    const checkIn = jest.fn(async () => ({}));
    const loop = remoteCheckInLoop({
      checkIn,
      onOutcome: checkInOutcomeLines(recordingLogger(lines)),
      random: () => 0.5,
    });

    loop.startAfter({
      ok: false,
      error: new ChannelError('HTTP 401', 'refused', {
        status: 401,
        hop: 'origin',
      }),
    });
    await jest.advanceTimersByTimeAsync(299_999);
    expect(checkIn).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);

    expect(checkIn).toHaveBeenCalledTimes(1);
    expect(lines).toEqual([
      {
        level: 'error',
        message: 'Check-in refused (401), serving on; next check-in in 5 min',
      },
      { level: 'info', message: 'Check-in answered again' },
    ]);
    loop.stop();
  });
});

describe('postCheckIn', () => {
  it.each<
    [
      string,
      number | undefined,
      (answer: Promise<unknown>) => Promise<void>,
      Array<{ status: number }>,
    ]
  >([
    [
      'a check-in the app takes',
      undefined,
      (answer) =>
        expect(answer).resolves.toEqual({ release: null, served: {} }),
      [{ status: 200 }],
    ],
    [
      'a check-in the app refuses',
      401,
      (answer) => expect(answer).rejects.toBeInstanceOf(ChannelError),
      [{ status: 401 }],
    ],
  ])(
    'hands the link the status of %s',
    async (_case, refused, settles, handed) => {
      const standIn = await startStandInApp();
      const linked = appLinkFromEnvironment({
        env: { WALKEROS_CREDENTIAL: (await standIn.pair()).raw },
        logger: createMockLogger(),
        knownValues: createKnownValues(),
      });
      const answers: Array<{ status: number }> = [];
      const link: AppLink = {
        ...linked,
        answered: ({ status }) => answers.push({ status }),
      };
      if (refused !== undefined)
        standIn.setAnswer('check-in', { status: refused });
      try {
        await settles(
          postCheckIn(link, { instanceId: '3f9a2b7c1d4e5f60' }, 5000),
        );
      } finally {
        linked.close();
        await standIn.stop();
      }

      expect(answers).toEqual(handed);
    },
  );
});

describe('bootCheckInMs', () => {
  /** A document of `deployment` stored in the cache. */
  const cached =
    (deployment: string) =>
    async (cache: ReleaseCache): Promise<void> => {
      const v1 = await buildRelease({ sequence: 1, deployment });
      await cache.storeDocument(v1.documentBytes, v1.documentSha256);
    };

  it.each<
    [string, (cache: ReleaseCache, documents: string) => Promise<void>, number]
  >([
    ['an empty cache', async () => {}, 10_000],
    [
      'a cache holding a release of this deployment',
      cached(FIXTURE_DEPLOYMENT),
      5000,
    ],
    ['a cache holding only another deployment', cached('dep_other'), 10_000],
    [
      'a cache folder it cannot read',
      async (_cache, documents) => chmodSync(documents, 0o000),
      5000,
    ],
  ])('gives the boot check-in of %s its time', async (_case, prepare, ms) => {
    const root = mkdtempSync(join(tmpdir(), 'walkeros-boot-check-in-'));
    const documents = join(root, 'cache', 'documents');
    try {
      const cache = await createReleaseCache(
        join(root, 'cache'),
        createMockLogger(),
      );
      await prepare(cache, documents);

      await expect(bootCheckInMs(cache, FIXTURE_DEPLOYMENT)).resolves.toBe(ms);
    } finally {
      chmodSync(documents, 0o700);
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('runRemote', () => {
  let saved: NodeJS.ProcessEnv;
  let printed: string[];
  let listeners: {
    exception: NodeJS.UncaughtExceptionListener[];
    rejection: NodeJS.UnhandledRejectionListener[];
    warning: NodeJS.WarningListener[];
    signals: Array<{ event: 'SIGTERM' | 'SIGINT' | 'exit'; count: number }>;
  };

  beforeEach(() => {
    saved = { ...process.env };
    delete process.env.WALKEROS_CREDENTIAL;
    listeners = {
      exception: process.listeners('uncaughtException'),
      rejection: process.listeners('unhandledRejection'),
      warning: process.listeners('warning'),
      signals: (['SIGTERM', 'SIGINT', 'exit'] as const).map((event) => ({
        event,
        count: process.listenerCount(event),
      })),
    };
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    resetProcessGuardsForTest();
    printed = [];
    const print = (line: unknown) => {
      printed.push(String(line));
    };
    jest.spyOn(console, 'log').mockImplementation(print);
    jest.spyOn(console, 'error').mockImplementation(print);
  });

  afterEach(() => {
    process.env = saved;
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    for (const listener of process.listeners('warning'))
      if (!listeners.warning.includes(listener))
        process.removeListener('warning', listener);
    for (const listener of listeners.exception)
      process.on('uncaughtException', listener);
    for (const listener of listeners.rejection)
      process.on('unhandledRejection', listener);
    // The command's own signal and exit handlers go with the test.
    for (const { event, count } of listeners.signals)
      for (const listener of process.listeners(event).slice(count))
        process.removeListener(event, listener);
    resetProcessGuardsForTest();
  });

  it("writes the client's and the check-in's refusal before an empty cache stops it", async () => {
    const root = mkdtempSync(join(tmpdir(), 'walkeros-remote-run-'));
    const standIn = await startStandInApp();
    standIn.setAnswer('check-in', { status: 401 });
    // The instance folder is made under TMPDIR: this test's own.
    process.env.TMPDIR = join(root, 'tmp');
    mkdirSync(process.env.TMPDIR);
    process.env.WALKEROS_CREDENTIAL = (await standIn.pair()).raw;
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    try {
      await expect(
        runRemote({ cacheDir: join(root, 'cache'), heartbeat: true, port: 0 }),
      ).rejects.toThrow('exit');
    } finally {
      await standIn.stop();
      rmSync(root, { recursive: true, force: true });
    }

    const at = (text: string) =>
      printed.findIndex((line) => line.includes(text));
    const client = at(
      "The app refused this runner's signed request (HTTP 401): its credential is not connected yet or has ended, or this clock is off",
    );
    const refused = at(
      'Check-in refused (401), serving on; next check-in in 5 min',
    );
    expect(client).toBeGreaterThanOrEqual(0);
    expect(client).toBeLessThan(refused);
    expect(refused).toBeLessThan(
      at('No release to run: the cache is empty and the app did not answer'),
    );
  });

  it('waits past 5 s at an empty cache for a slow first token, then checks in signed', async () => {
    const root = mkdtempSync(join(tmpdir(), 'walkeros-remote-run-'));
    const standIn = await startStandInApp();
    const slow = await testCredential('deployment', {
      resource: `${standIn.origin}/api`,
      iss: TEST_ISSUER,
      id: FIXTURE_DEPLOYMENT,
    });
    standIn.setCredential(slow.credential);
    process.env.TMPDIR = join(root, 'tmp');
    mkdirSync(process.env.TMPDIR);
    process.env.WALKEROS_CREDENTIAL = slow.raw;
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const after = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    let tokenRequests = 0;
    // Discovery and a nonce answer take 2 s each, and the second token
    // request hangs until the client's 2.5 s attempt cap: the client signs
    // after about 6.5 s, past the 5 s a cached release would give it.
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url === `${TEST_ISSUER}/.well-known/oauth-authorization-server`) {
        await after(2000);
        return Response.json({
          issuer: TEST_ISSUER,
          service_token_endpoint: `${TEST_ISSUER}/api/services/token`,
          dpop_signing_alg_values_supported: ['ES256'],
        });
      }
      if (url === `${TEST_ISSUER}/api/services/token`) {
        tokenRequests += 1;
        if (tokenRequests > 1) return new Promise<Response>(() => {});
        await after(2000);
        return Response.json(
          { error: 'use_dpop_nonce' },
          { status: 400, headers: { 'DPoP-Nonce': 'nonce-1' } },
        );
      }
      return realFetch(input, init);
    };
    try {
      await expect(
        runRemote({ cacheDir: join(root, 'cache'), heartbeat: true, port: 0 }),
      ).rejects.toThrow('exit');
    } finally {
      globalThis.fetch = realFetch;
      await standIn.stop();
      rmSync(root, { recursive: true, force: true });
    }

    expect(
      standIn.requests
        .filter((request) => request.route === 'check-in')
        .map((request) => request.headers['signature-input'] !== undefined),
    ).toEqual([true]);
    expect(
      printed.filter((line) => line.includes('No release to run')),
    ).toEqual([
      expect.stringContaining(
        'No release to run: the cache is empty and the app names no release',
      ),
    ]);
  });

  it('keeps serving through an uncaught exception, with one ERROR line', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    // Without its credential the command stops after its guards are up.
    await expect(
      runRemote({ cacheDir: '/unused', heartbeat: true, port: 8080 }),
    ).rejects.toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockClear();
    printed = [];

    for (const listener of process.listeners('uncaughtException'))
      listener(new Error('stray throw in the supervisor'), 'uncaughtException');

    expect(printed).toHaveLength(1);
    expect(printed[0]).toContain(
      'Uncaught exception (continuing): stray throw in the supervisor',
    );
    expect(exit).not.toHaveBeenCalled();
  });
});
