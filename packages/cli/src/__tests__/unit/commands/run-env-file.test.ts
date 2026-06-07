/**
 * Opt-in dotenv loader for `walkeros run --env-file`.
 *
 * Behavior under test:
 * - Loads KEY=VALUE pairs into process.env when the file is passed.
 * - Does NOT override keys already set in process.env (existing env wins).
 * - REFUSES a world/group-readable file on POSIX (throws, loads nothing).
 * - Parses quoted values, skips comments and blank lines.
 */

import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadEnvFile } from '../../../commands/run/env-file.js';

describe('loadEnvFile', () => {
  let dir: string;
  const touched: string[] = [];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-envfile-'));
  });

  afterEach(() => {
    for (const k of touched) delete process.env[k];
    touched.length = 0;
    rmSync(dir, { recursive: true, force: true });
  });

  function track(...keys: string[]): void {
    touched.push(...keys);
  }

  function writeEnv(name: string, content: string, mode = 0o600): string {
    const p = join(dir, name);
    writeFileSync(p, content, { mode });
    chmodSync(p, mode);
    return p;
  }

  it('loads KEY=VALUE pairs into process.env', () => {
    track('WALKEROS_TEST_A', 'WALKEROS_TEST_B');
    const p = writeEnv('.env', 'WALKEROS_TEST_A=alpha\nWALKEROS_TEST_B=beta\n');
    loadEnvFile(p);
    expect(process.env.WALKEROS_TEST_A).toBe('alpha');
    expect(process.env.WALKEROS_TEST_B).toBe('beta');
  });

  it('parses quoted values and skips comments and blank lines', () => {
    track('WALKEROS_TEST_Q', 'WALKEROS_TEST_C');
    const p = writeEnv(
      '.env',
      '# a comment\n\nWALKEROS_TEST_Q="quoted value"\n  # indented comment\nWALKEROS_TEST_C=plain\n',
    );
    loadEnvFile(p);
    expect(process.env.WALKEROS_TEST_Q).toBe('quoted value');
    expect(process.env.WALKEROS_TEST_C).toBe('plain');
  });

  it('does NOT override a key already set in process.env', () => {
    track('WALKEROS_TEST_PRESET');
    process.env.WALKEROS_TEST_PRESET = 'original';
    const p = writeEnv('.env', 'WALKEROS_TEST_PRESET=fromfile\n');
    loadEnvFile(p);
    expect(process.env.WALKEROS_TEST_PRESET).toBe('original');
  });

  it('REFUSES a group/other-readable (0644) file', () => {
    track('WALKEROS_TEST_INSECURE');
    const p = writeEnv('.env', 'WALKEROS_TEST_INSECURE=nope\n', 0o644);
    expect(() => loadEnvFile(p)).toThrow(/permission|readable|0600|mode/i);
    // Nothing loaded.
    expect(process.env.WALKEROS_TEST_INSECURE).toBeUndefined();
  });

  it('throws a clear error when the file does not exist', () => {
    const p = join(dir, 'missing.env');
    expect(() => loadEnvFile(p)).toThrow();
  });
});
