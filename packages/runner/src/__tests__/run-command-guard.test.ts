/**
 * The refusal assertion in runCommand: this runtime cannot bundle, so every
 * resolved bundle must be a prebuilt artifact, and a `file` artifact must
 * exist. Driven through the REAL resolveBundle and refusal predicate; only
 * the pipeline, stdin and the logger are stubbed. The refusal is keyed on the
 * artifact's shape and on no env var, so it is asserted with and without the
 * managed-runner env the app sets.
 */

import { Level } from '@walkeros/core';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const runPipeline = jest.fn();

jest.mock('../pipeline.js', () => ({
  runPipeline: (...args: unknown[]) => runPipeline(...args),
}));

// Never read the test runner's stdin: a missing path must fall through to the
// file branch, not block on a pipe.
jest.mock('../stdin.js', () => ({
  isStdinPiped: () => false,
  readStdin: jest.fn(),
}));

const errorLog = jest.fn();
const jsonLog = jest.fn();
jest.mock('@walkeros/core/node', () => ({
  ...jest.requireActual('@walkeros/core/node'),
  createCLILogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: errorLog,
    json: jsonLog,
    scope: jest.fn().mockReturnValue({ info: jest.fn() }),
  }),
  createCLILoggerConfig: () => ({ level: Level.DEBUG, handler: jest.fn() }),
}));

import { runCommand } from '../run.js';

describe('runCommand refuses anything but a prebuilt artifact', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  let exitSpy: jest.SpyInstance;
  let exitCode: number | undefined;
  let dir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    exitCode = undefined;
    dir = mkdtempSync(join(tmpdir(), 'runtime-guard-'));
    // process.exit throws so control flow stops like the real exit.
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null | undefined) => {
        exitCode = typeof code === 'number' ? code : undefined;
        throw new Error(`__exit__:${code}`);
      });
    runPipeline.mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  function loggedErrors(): string {
    return errorLog.mock.calls.map((call) => String(call[0])).join('\n');
  }

  it.each([
    ['without runner env', undefined],
    ['with WALKEROS_CLIENT_TYPE=runner', 'runner'],
  ])(
    'refuses an existing .json flow config (%s) and never starts the pipeline',
    async (_label, clientType) => {
      if (clientType) process.env.WALKEROS_CLIENT_TYPE = clientType;
      const config = join(dir, 'flow.json');
      writeFileSync(config, '{"version":4,"flows":{}}');

      await expect(runCommand({ config })).rejects.toThrow(/__exit__/);

      expect(exitCode).toBe(1);
      expect(runPipeline).not.toHaveBeenCalled();
      expect(loggedErrors()).toContain(
        `BUNDLE must be a prebuilt artifact (.mjs, .js, .cjs, .tar.gz, .tgz), got ${config}`,
      );
      expect(loggedErrors()).toContain('walkeros bundle');
    },
  );

  it('refuses a prebuilt path that does not exist, with the COPY hint', async () => {
    const missing = join(dir, 'flow.mjs');

    await expect(runCommand({ config: missing })).rejects.toThrow(/__exit__/);

    expect(exitCode).toBe(1);
    expect(runPipeline).not.toHaveBeenCalled();
    expect(loggedErrors()).toContain(`Flow artifact not found: ${missing}`);
    expect(loggedErrors()).toContain('COPY --from=builder /build/dist/');
  });

  it('with no artifact given, looks for flow.mjs in the working directory', async () => {
    process.chdir(dir);

    await expect(runCommand({})).rejects.toThrow(/__exit__/);

    expect(runPipeline).not.toHaveBeenCalled();
    expect(loggedErrors()).toMatch(/Flow artifact not found: .*flow\.mjs/);
  });

  it('starts the pipeline with the absolute path of an existing prebuilt artifact', async () => {
    const artifact = join(dir, 'flow.mjs');
    writeFileSync(artifact, 'export default async () => ({});');

    await runCommand({ config: artifact });

    expect(errorLog).not.toHaveBeenCalled();
    expect(runPipeline).toHaveBeenCalledTimes(1);
    expect(runPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ bundlePath: artifact }),
    );
  });

  it('scrubs a presigned URL signature from --json error output', async () => {
    const signature =
      'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const url =
      'https://bucket.s3.eu-central-1.amazonaws.com/flow.mjs' +
      `?X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20260924&X-Amz-Signature=${signature}`;
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('denied', { status: 403 }));

    await expect(runCommand({ config: url, json: true })).rejects.toThrow(
      /__exit__/,
    );

    expect(jsonLog).toHaveBeenCalledTimes(1);
    const printed = JSON.stringify(jsonLog.mock.calls[0][0]);
    expect(printed).toContain('Failed to fetch bundle');
    expect(printed).not.toContain(signature);
    expect(printed).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });
});
