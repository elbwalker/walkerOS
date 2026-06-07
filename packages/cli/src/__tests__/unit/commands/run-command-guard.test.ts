/**
 * Guards in runCommand / resolveBundlePath.
 *
 * Covers the runner-requires-BUNDLE guard: a managed flow container
 * (WALKEROS_CLIENT_TYPE=runner) started without a prebuilt BUNDLE must fail
 * fast and MUST NOT enter the in-container boot-build fallback (which exceeds
 * the health-check window and gets killed with no log).
 */

import type { RunCommandOptions } from '../../../commands/run/types.js';

const prepareBundleForRun = jest.fn();
const resolveBundle = jest.fn();
const fetchConfig = jest.fn();
const runPipeline = jest.fn();

jest.mock('../../../commands/run/utils.js', () => ({
  prepareBundleForRun: (...args: unknown[]) => prepareBundleForRun(...args),
  isPreBuiltConfig: () => true,
}));

jest.mock('../../../runtime/resolve-bundle.js', () => ({
  resolveBundle: (...args: unknown[]) => resolveBundle(...args),
}));

jest.mock('../../../runtime/config-fetcher.js', () => ({
  fetchConfig: (...args: unknown[]) => fetchConfig(...args),
}));

jest.mock('../../../commands/run/pipeline.js', () => ({
  runPipeline: (...args: unknown[]) => runPipeline(...args),
}));

jest.mock('../../../runtime/cache.js', () => ({
  readCache: jest.fn().mockReturnValue(undefined),
  writeCache: jest.fn(),
}));

const errorLog = jest.fn();
jest.mock('../../../core/cli-logger.js', () => ({
  createCLILogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: errorLog,
    json: jest.fn(),
    scope: jest.fn().mockReturnValue({ info: jest.fn() }),
  }),
}));

import { runCommand } from '../../../commands/run/index.js';

describe('runCommand runner-requires-BUNDLE guard', () => {
  const originalEnv = { ...process.env };
  let exitSpy: jest.SpyInstance;
  let exitCode: number | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    exitCode = undefined;
    delete process.env.WALKEROS_CLIENT_TYPE;
    delete process.env.BUNDLE;
    // process.exit throws so control flow stops like the real exit.
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null | undefined) => {
        exitCode = typeof code === 'number' ? code : undefined;
        throw new Error(`__exit__:${code}`);
      });
    // resolveBundle returns a prebuilt path when configInput is provided.
    resolveBundle.mockResolvedValue({
      source: 'file',
      path: '/tmp/bundle.mjs',
    });
    runPipeline.mockResolvedValue(undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  const opts: RunCommandOptions = {};

  it('runner mode + no BUNDLE: exits non-zero fast, never bundles', async () => {
    process.env.WALKEROS_CLIENT_TYPE = 'runner';
    // No BUNDLE / no configInput.

    await expect(runCommand({ ...opts })).rejects.toThrow(/__exit__/);

    expect(exitCode).toBe(1);
    // Must NOT enter the bundle pipeline.
    expect(prepareBundleForRun).not.toHaveBeenCalled();
    expect(fetchConfig).not.toHaveBeenCalled();
    expect(runPipeline).not.toHaveBeenCalled();
    // Clear, key-only fatal message logged.
    const logged = errorLog.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain(
      'Managed runner started without a BUNDLE artifact; refusing to self-bundle',
    );
  });

  it('runner mode WITH BUNDLE: guard does not fire, proceeds to pipeline', async () => {
    process.env.WALKEROS_CLIENT_TYPE = 'runner';
    process.env.BUNDLE = '/tmp/bundle.mjs';

    await runCommand({ ...opts, config: process.env.BUNDLE });

    expect(resolveBundle).toHaveBeenCalledWith('/tmp/bundle.mjs');
    expect(runPipeline).toHaveBeenCalledTimes(1);
  });

  it('non-runner local run + no BUNDLE: guard does NOT fire (local path used)', async () => {
    // No WALKEROS_CLIENT_TYPE, no BUNDLE — Case 3 default file path.
    await runCommand({ ...opts });

    // Default path resolves to server-collect.mjs and reaches the pipeline.
    expect(runPipeline).toHaveBeenCalledTimes(1);
    expect(errorLog).not.toHaveBeenCalled();
    expect(prepareBundleForRun).not.toHaveBeenCalled();
  });
});
