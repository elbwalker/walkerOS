/**
 * `runneros start` option resolution. The opt-in --env-file is loaded before
 * any env fallback is read, so values that live only in the file (flow id,
 * project, deployment id, port, BUNDLE) take effect. runCommand no longer
 * loads it, so the file is read exactly once.
 */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveStartOptions } from '../start-options.js';

const KEYS = [
  'BUNDLE',
  'PORT',
  'WALKEROS_FLOW_ID',
  'WALKEROS_PROJECT_ID',
  'WALKEROS_DEPLOYMENT_ID',
] as const;

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

  it('reads the env fallbacks from the env file', () => {
    const envFile = writeEnvFile(
      [
        'BUNDLE=/app/flow/flow.mjs',
        'PORT=9090',
        'WALKEROS_FLOW_ID=flow_from_file',
        'WALKEROS_PROJECT_ID=proj_from_file',
        'WALKEROS_DEPLOYMENT_ID=dep_from_file',
      ].join('\n'),
    );

    expect(resolveStartOptions(undefined, { envFile })).toEqual({
      config: '/app/flow/flow.mjs',
      port: 9090,
      flowId: 'flow_from_file',
      project: 'proj_from_file',
      deploymentId: 'dep_from_file',
      json: undefined,
      verbose: undefined,
      silent: undefined,
    });
  });

  it('keeps flags and existing env over the file', () => {
    process.env.WALKEROS_PROJECT_ID = 'proj_from_env';
    const envFile = writeEnvFile(
      'WALKEROS_FLOW_ID=flow_from_file\nWALKEROS_PROJECT_ID=proj_from_file\n',
    );

    const options = resolveStartOptions('flow.mjs', {
      envFile,
      flowId: 'flow_from_flag',
    });

    expect(options.config).toBe('flow.mjs');
    expect(options.flowId).toBe('flow_from_flag');
    expect(options.project).toBe('proj_from_env');
  });

  it('loads nothing without --env-file (no auto-discovery)', () => {
    writeEnvFile('WALKEROS_FLOW_ID=should_not_load\n');

    expect(resolveStartOptions(undefined, {}).flowId).toBeUndefined();
    expect(process.env.WALKEROS_FLOW_ID).toBeUndefined();
  });
});
