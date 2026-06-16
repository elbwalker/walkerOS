/**
 * Wiring of the opt-in --env-file flag into runCommand.
 *
 * - With options.envFile set: the dotenv file is loaded into process.env
 *   before the pipeline runs.
 * - Without it: no auto-discovery, nothing is loaded.
 */

import { Level } from '@walkeros/core';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { RunCommandOptions } from '../../../commands/run/types.js';

const resolveBundle = jest.fn();
const runPipeline = jest.fn();

jest.mock('../../../commands/run/utils.js', () => ({
  prepareBundleForRun: jest.fn(),
  isPreBuiltConfig: () => true,
}));

jest.mock('../../../runtime/resolve-bundle.js', () => ({
  resolveBundle: (...args: unknown[]) => resolveBundle(...args),
}));

jest.mock('../../../runtime/config-fetcher.js', () => ({
  fetchConfig: jest.fn(),
}));

jest.mock('../../../commands/run/pipeline.js', () => ({
  runPipeline: (...args: unknown[]) => runPipeline(...args),
}));

jest.mock('../../../runtime/cache.js', () => ({
  readCache: jest.fn().mockReturnValue(undefined),
  writeCache: jest.fn(),
}));

jest.mock('../../../core/cli-logger.js', () => ({
  createCLILogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    json: jest.fn(),
    scope: jest.fn().mockReturnValue({ info: jest.fn() }),
  }),
  createCLILoggerConfig: () => ({ level: Level.DEBUG, handler: jest.fn() }),
}));

import { runCommand } from '../../../commands/run/index.js';

describe('runCommand --env-file wiring', () => {
  const originalEnv = { ...process.env };
  let dir: string;
  const opts: RunCommandOptions = {};

  beforeEach(() => {
    jest.clearAllMocks();
    dir = mkdtempSync(join(tmpdir(), 'walkeros-envwire-'));
    resolveBundle.mockResolvedValue({
      source: 'file',
      path: '/tmp/bundle.mjs',
    });
    runPipeline.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads the env file into process.env when --env-file is passed', async () => {
    const p = join(dir, '.env');
    writeFileSync(p, 'WALKEROS_WIRED_KEY=loaded\n', { mode: 0o600 });
    chmodSync(p, 0o600);

    await runCommand({ ...opts, config: '/tmp/bundle.mjs', envFile: p });

    expect(process.env.WALKEROS_WIRED_KEY).toBe('loaded');
    expect(runPipeline).toHaveBeenCalledTimes(1);
    delete process.env.WALKEROS_WIRED_KEY;
  });

  it('does NOT auto-load any .env when no flag is passed', async () => {
    // A .env exists in cwd-like dir but is never referenced.
    const p = join(dir, '.env');
    writeFileSync(p, 'WALKEROS_AUTOLOAD_KEY=should_not_load\n', {
      mode: 0o600,
    });

    await runCommand({ ...opts, config: '/tmp/bundle.mjs' });

    expect(process.env.WALKEROS_AUTOLOAD_KEY).toBeUndefined();
    expect(runPipeline).toHaveBeenCalledTimes(1);
  });
});
