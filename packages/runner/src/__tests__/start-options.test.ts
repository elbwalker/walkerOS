/**
 * `runneros start` option resolution. The opt-in --env-file is loaded before
 * any env fallback is read, so values that live only in the file (port,
 * BUNDLE, the credential) take effect. runCommand no longer loads it, so the
 * file is read exactly once.
 */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveStartOptions } from '../start-options.js';

const KEYS = ['BUNDLE', 'PORT', 'WALKEROS_CREDENTIAL'] as const;

describe('resolveStartOptions', () => {
  const originalEnv = { ...process.env };
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-start-options-'));
    for (const key of KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(dir, { recursive: true, force: true });
  });

  function writeEnvFile(content: string): string {
    const file = join(dir, '.env');
    writeFileSync(file, content, { mode: 0o600 });
    chmodSync(file, 0o600);
    return file;
  }

  it('reads the env fallbacks from the env file, and leaves the credential for its read', () => {
    const envFile = writeEnvFile(
      [
        'BUNDLE=/app/flow/flow.mjs',
        'PORT=9090',
        'WALKEROS_CREDENTIAL=wos_cred_from_file',
      ].join('\n'),
    );

    expect(resolveStartOptions(undefined, { envFile })).toEqual({
      config: '/app/flow/flow.mjs',
      port: 9090,
      json: undefined,
      verbose: undefined,
      silent: undefined,
    });
    expect(process.env.WALKEROS_CREDENTIAL).toBe('wos_cred_from_file');
  });

  it('keeps flags and existing env over the file', () => {
    process.env.BUNDLE = '/from/env.mjs';
    const envFile = writeEnvFile('BUNDLE=/from/file.mjs\nPORT=9090\n');

    const options = resolveStartOptions(undefined, { envFile, port: 8081 });

    expect(options.config).toBe('/from/env.mjs');
    expect(options.port).toBe(8081);
  });

  it('loads nothing without --env-file (no auto-discovery)', () => {
    writeEnvFile('BUNDLE=should_not_load\n');

    expect(resolveStartOptions(undefined, {}).config).toBeUndefined();
    expect(process.env.BUNDLE).toBeUndefined();
  });
});
