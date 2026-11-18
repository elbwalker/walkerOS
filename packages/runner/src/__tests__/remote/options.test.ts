import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { ChannelError } from '@walkeros/server-core';
import { resetProcessGuardsForTest } from '../../pipeline.js';
import {
  checkInOutcomeLines,
  remoteCheckInLoop,
  runRemote,
} from '../../remote/command.js';
import { recordingLogger, type Line } from '../helpers/supervisor-harness.js';
import { startStandInApp } from '../helpers/stand-in-app.js';
import { FIXTURE_DEPLOYMENT } from '../helpers/release-fixture.js';
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

describe('runRemote', () => {
  const linkNames = [
    'WALKEROS_APP_URL',
    'WALKEROS_DEPLOYMENT_ID',
    'WALKEROS_DEPLOY_TOKEN',
    'WALKEROS_TOKEN',
  ];
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
    for (const name of linkNames) delete process.env[name];
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

  it('writes the boot check-in refusal before an empty cache stops it', async () => {
    const root = mkdtempSync(join(tmpdir(), 'walkeros-remote-run-'));
    const standIn = await startStandInApp();
    standIn.setAnswer('check-in', { status: 401 });
    // The instance folder is made under TMPDIR: this test's own.
    process.env.TMPDIR = join(root, 'tmp');
    mkdirSync(process.env.TMPDIR);
    process.env.WALKEROS_APP_URL = standIn.origin;
    process.env.WALKEROS_DEPLOYMENT_ID = FIXTURE_DEPLOYMENT;
    process.env.WALKEROS_DEPLOY_TOKEN = 'stand-in-token-for-the-run';
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
    const refused = at(
      'Check-in refused (401), serving on; next check-in in 5 min',
    );
    expect(refused).toBeGreaterThanOrEqual(0);
    expect(refused).toBeLessThan(
      at('No release to run: the cache is empty and the app did not answer'),
    );
  });

  it('keeps serving through an uncaught exception, with one ERROR line', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    // Without its link variables the command stops after its guards are up.
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
