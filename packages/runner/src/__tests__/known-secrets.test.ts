/**
 * Secrets fetched at startup are masked in every log line written after the
 * fetch: the runner logger, the collector logger handed to the bundle, both
 * rings, and the error path of runCommand. The loggers exist before the fetch,
 * so they read the known values per line. Only the pipeline is stubbed; the
 * stub plays the fetch by calling `onSecrets`, then logs like the runtime.
 */

import { createLogger, type Logger } from '@walkeros/core';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PipelineOptions } from '../pipeline.js';

const SECRET = 'value-abc123';

const runPipeline = jest.fn<Promise<void>, [PipelineOptions]>();

jest.mock('../pipeline.js', () => ({
  runPipeline: (options: PipelineOptions) => runPipeline(options),
}));

jest.mock('../stdin.js', () => ({
  isStdinPiped: () => false,
  readStdin: jest.fn(),
}));

import { runCommand } from '../run.js';

function collectorLogger(options: PipelineOptions): Logger.Instance {
  const config = options.loggerConfig;
  if (!config) throw new Error('runCommand passed no collector logger config');
  return createLogger(config);
}

describe('runCommand masks secrets fetched after the loggers exist', () => {
  let dir: string;
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

  it('masks the value in both loggers, both rings and the error path', async () => {
    let seen: PipelineOptions | undefined;
    runPipeline.mockImplementation(async (options) => {
      seen = options;
      options.onSecrets?.([SECRET]);
      options.logger.error(`runner saw ${SECRET}`);
      collectorLogger(options).scope('bq').error(`Push failed with ${SECRET}`);
      throw new Error(`boot failed with ${SECRET}`);
    });

    await expect(runCommand({ config: artifact })).rejects.toThrow(/__exit__/);

    const errors = seen?.errorRing?.snapshot() ?? [];
    const logs = seen?.logRing?.snapshot() ?? [];
    expect(errors.map((e) => e.message)).toEqual([
      '[runner] runner saw ***',
      '[bq] Push failed with ***',
      'Error: boot failed with ***',
    ]);
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).not.toContain(SECRET);
    expect(printed()).toContain('Push failed with ***');
    expect(printed()).not.toContain(SECRET);
  });

  it('masks the value in the --json error output', async () => {
    runPipeline.mockImplementation(async (options) => {
      options.onSecrets?.([SECRET]);
      throw new Error(`boot failed with ${SECRET}`);
    });

    await expect(runCommand({ config: artifact, json: true })).rejects.toThrow(
      /__exit__/,
    );

    expect(printed()).toContain('boot failed with ***');
    expect(printed()).not.toContain(SECRET);
  });

  it('logs unchanged when no secrets were fetched', async () => {
    runPipeline.mockImplementation(async (options) => {
      options.logger.error(`runner saw ${SECRET}`);
    });

    await runCommand({ config: artifact });

    expect(printed()).toContain(`[runner] runner saw ${SECRET}`);
  });
});
