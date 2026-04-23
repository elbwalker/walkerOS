import { mkdirSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  telemetryStatusCommand,
  telemetryEnableCommand,
  telemetryDisableCommand,
} from '../index.js';
import { readConfig, getConfigPath } from '../../../lib/config-file.js';

const testDir = join(tmpdir(), `telemetry-cmd-test-${Date.now()}`);

describe('telemetry subcommand', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Redirect XDG_CONFIG_HOME so getConfigDir() points to our temp dir.
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
    delete process.env.DO_NOT_TRACK;
    delete process.env.WALKEROS_TELEMETRY_DISABLED;
    const p = getConfigPath();
    if (existsSync(p)) unlinkSync(p);
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('status reports enabled by default', () => {
    const out = captureStdout(() => telemetryStatusCommand());
    expect(out).toMatch(/enabled/i);
  });

  it('status reports disabled when DO_NOT_TRACK is set', () => {
    process.env.DO_NOT_TRACK = '1';
    const out = captureStdout(() => telemetryStatusCommand());
    expect(out).toMatch(/disabled/i);
    expect(out).toContain('DO_NOT_TRACK');
  });

  it('status reports disabled when WALKEROS_TELEMETRY_DISABLED is set', () => {
    process.env.WALKEROS_TELEMETRY_DISABLED = '1';
    const out = captureStdout(() => telemetryStatusCommand());
    expect(out).toMatch(/disabled/i);
    expect(out).toContain('WALKEROS_TELEMETRY_DISABLED');
  });

  it('enable/disable writes config flag', () => {
    telemetryDisableCommand();
    expect(readConfig()?.telemetryEnabled).toBe(false);
    telemetryEnableCommand();
    expect(readConfig()?.telemetryEnabled).toBe(true);
  });

  it('enable seeds installationId when missing', () => {
    telemetryEnableCommand();
    const cfg = readConfig();
    expect(cfg?.telemetryEnabled).toBe(true);
    expect(cfg?.installationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('disable reports the config file as the reason via status', () => {
    telemetryDisableCommand();
    const out = captureStdout(() => telemetryStatusCommand());
    expect(out).toMatch(/disabled/i);
    expect(out).toContain('config file');
  });
});

function captureStdout(fn: () => void): string {
  let out = '';
  const spy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      out += String(chunk);
      return true;
    });
  try {
    fn();
    return out;
  } finally {
    spy.mockRestore();
  }
}
