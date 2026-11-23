/**
 * Secrets fetched at startup are masked in every log line written after the
 * fetch: the runner logger, the collector logger handed to the bundle, both
 * rings, and the error path of runCommand. The loggers exist before the fetch,
 * so they read the known values per line. Only the pipeline is stubbed; the
 * stub plays the fetch by adding to `knownValues`, then logs like the runtime.
 */

import http from 'http';
import { createLogger, type Logger } from '@walkeros/core';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { HealthServer } from '../health-server.js';
import type { PipelineOptions } from '../pipeline.js';
import type * as Pipeline from '../pipeline.js';
import type { RunCommandOptions } from '../types.js';
import { testCredential } from './helpers/credential.js';

const SECRET = 'value-abc123';

const runPipeline = jest.fn<Promise<void>, [PipelineOptions]>();

jest.mock('../pipeline.js', () => ({
  runPipeline: (options: PipelineOptions) => runPipeline(options),
}));

// The real pipeline runs in one test; the health server binds no port there
// and the app delivers no secret.
jest.mock('../health-server.js', () => ({ createHealthServer: jest.fn() }));
jest.mock('../secrets-fetcher.js', () => ({
  fetchSecrets: jest.fn().mockResolvedValue({}),
}));

jest.mock('../stdin.js', () => ({
  isStdinPiped: () => false,
  readStdin: jest.fn(),
}));

import { runCommand } from '../run.js';
import { createHealthServer } from '../health-server.js';

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function collectorLogger(options: PipelineOptions): Logger.Instance {
  const config = options.loggerConfig;
  if (!config) throw new Error('runCommand passed no collector logger config');
  return createLogger(config);
}

describe('runCommand masks secrets fetched after the loggers exist', () => {
  let credential: string;
  let dir: string;

  beforeAll(async () => {
    credential = (await testCredential()).raw;
  });

  let artifact: string;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    dir = mkdtempSync(join(tmpdir(), 'runner-known-secrets-'));
    artifact = join(dir, 'flow.mjs');
    writeFileSync(artifact, 'export default async () => ({});');
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`__exit__:${code}`);
    });
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  function printed(): string {
    return [...errorSpy.mock.calls, ...logSpy.mock.calls]
      .map((call) => call.map(String).join(' '))
      .join('\n');
  }

  it('masks the value in both loggers and the error path, and builds no ring without a credential', async () => {
    let seen: PipelineOptions | undefined;
    runPipeline.mockImplementation(async (options) => {
      seen = options;
      options.knownValues.add([SECRET]);
      options.logger.error(`runner saw ${SECRET}`);
      collectorLogger(options).scope('bq').error(`Push failed with ${SECRET}`);
      throw new Error(`boot failed with ${SECRET}`);
    });

    await expect(runCommand({ config: artifact })).rejects.toThrow(/__exit__/);

    expect(seen?.errorRing).toBeUndefined();
    expect(seen?.logRing).toBeUndefined();
    expect(printed()).toContain('runner saw ***');
    expect(printed()).toContain('Push failed with ***');
    expect(printed()).toContain('boot failed with ***');
    expect(printed()).not.toContain(SECRET);
  });

  it('fills both rings with a credential, masked', async () => {
    const before = {
      credential: process.env.WALKEROS_CREDENTIAL,
      cache: process.env.WALKEROS_CACHE_DIR,
    };
    process.env.WALKEROS_CREDENTIAL = credential;
    process.env.WALKEROS_CACHE_DIR = join(dir, 'cache');
    let seen: PipelineOptions | undefined;
    runPipeline.mockImplementation(async (options) => {
      seen = options;
      options.logger.info(`runner saw ${SECRET}`);
      options.knownValues.add([SECRET]);
      collectorLogger(options).scope('bq').error(`Push failed with ${SECRET}`);
    });

    try {
      await runCommand({ config: artifact });
    } finally {
      restoreEnv('WALKEROS_CREDENTIAL', before.credential);
      restoreEnv('WALKEROS_CACHE_DIR', before.cache);
    }

    const lines = (seen?.logRing?.snapshot() ?? []).map((e) => e.line.masked());
    expect(lines).toContain('[runner] runner saw ***');
    expect(lines.join('\n')).not.toContain(SECRET);
    const errors = (seen?.errorRing?.snapshot() ?? []).map((e) => e.message);
    expect(errors).toEqual(['[bq] Push failed with ***']);
  });

  it('masks the value in the --json error output', async () => {
    runPipeline.mockImplementation(async (options) => {
      options.knownValues.add([SECRET]);
      throw new Error(`boot failed with ${SECRET}`);
    });

    await expect(runCommand({ config: artifact, json: true })).rejects.toThrow(
      /__exit__/,
    );

    expect(printed()).toContain('boot failed with ***');
    expect(printed()).not.toContain(SECRET);
  });

  describe('a declared $env value set in the environment', () => {
    const VALUE = 'host-xyz789';
    const originalCwd = process.cwd();
    const before = {
      credential: process.env.WALKEROS_CREDENTIAL,
      cache: process.env.WALKEROS_CACHE_DIR,
    };

    beforeEach(() => {
      process.env.FIXTURE_DB_HOST = VALUE;
      // The artifact reads the name through `$env`; its factory fails with the
      // value, after the runner prepared the environment.
      writeFileSync(
        artifact,
        `export const __walkerosEnv = { secrets: [], env: ['FIXTURE_DB_HOST'] };
export default async function() {
  throw new Error('boot failed with ' + process.env.FIXTURE_DB_HOST);
}`,
      );
      const healthServer: HealthServer = {
        server: new http.Server(),
        setFlowHandler: jest.fn(),
        setReady: jest.fn(),
        setFailed: jest.fn(),
        setDegraded: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
      jest.mocked(createHealthServer).mockResolvedValue(healthServer);
      // The pipeline's process guards and signal handlers stay off the
      // test process.
      jest.spyOn(process, 'on').mockReturnValue(process);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      delete process.env.FIXTURE_DB_HOST;
      restoreEnv('WALKEROS_CREDENTIAL', before.credential);
      restoreEnv('WALKEROS_CACHE_DIR', before.cache);
    });

    it.each<[string, RunCommandOptions, boolean]>([
      ['with no app, in text', {}, false],
      ['with no app, in --json', { json: true }, false],
      ['with an app that delivers no secret', {}, true],
    ])(
      'is masked in both loggers, the rings and the error output, %s',
      async (_case, options, rings) => {
        if (rings) {
          process.env.WALKEROS_CREDENTIAL = credential;
          process.env.WALKEROS_CACHE_DIR = join(dir, 'cache');
        }
        const actual = jest.requireActual<typeof Pipeline>('../pipeline.js');
        let seen: PipelineOptions | undefined;
        runPipeline.mockImplementation(async (pipelineOptions) => {
          seen = pipelineOptions;
          try {
            await actual.runPipeline(pipelineOptions);
          } finally {
            pipelineOptions.logger.info(`runner saw ${VALUE}`);
            collectorLogger(pipelineOptions)
              .scope('bq')
              .error(`Push failed with ${VALUE}`);
          }
        });

        await expect(
          runCommand({ ...options, config: artifact }),
        ).rejects.toThrow(/__exit__/);

        const errors = (seen?.errorRing?.snapshot() ?? []).map(
          (e) => e.message,
        );
        expect(Boolean(seen?.errorRing)).toBe(rings);
        if (rings) expect(errors).toContain('[bq] Push failed with ***');
        expect(errors.join('\n')).not.toContain(VALUE);
        const lines = (seen?.logRing?.snapshot() ?? []).map((e) =>
          e.line.masked(),
        );
        expect(Boolean(seen?.logRing)).toBe(rings);
        if (rings) expect(lines).toContain('[runner] runner saw ***');
        expect(lines.join('\n')).not.toContain(VALUE);
        expect(printed()).toContain('boot failed with ***');
        expect(printed()).not.toContain(VALUE);
      },
    );
  });

  it('logs unchanged when no secrets were fetched', async () => {
    runPipeline.mockImplementation(async (options) => {
      options.logger.error(`runner saw ${SECRET}`);
    });

    await runCommand({ config: artifact });

    expect(printed()).toContain(`[runner] runner saw ${SECRET}`);
  });
});
