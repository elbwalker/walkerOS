import { mkdirSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { isTelemetryEnabled, isDebugMode } from '../opt-out.js';
import { writeConfig, getConfigPath } from '../../lib/config-file.js';

const testDir = join(tmpdir(), `opt-out-test-${Date.now()}`);

describe('isTelemetryEnabled', () => {
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

  it('is enabled by default', () => {
    expect(isTelemetryEnabled()).toBe(true);
  });

  it('is disabled by DO_NOT_TRACK=1', () => {
    process.env.DO_NOT_TRACK = '1';
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is disabled by DO_NOT_TRACK=true', () => {
    process.env.DO_NOT_TRACK = 'true';
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is disabled by WALKEROS_TELEMETRY_DISABLED=1', () => {
    process.env.WALKEROS_TELEMETRY_DISABLED = '1';
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is disabled by config telemetryEnabled=false', () => {
    writeConfig({ telemetryEnabled: false });
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('env var wins over config', () => {
    writeConfig({ telemetryEnabled: true });
    process.env.DO_NOT_TRACK = '1';
    expect(isTelemetryEnabled()).toBe(false);
  });
});

describe('isDebugMode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALKEROS_TELEMETRY_DEBUG;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('is false by default', () => {
    expect(isDebugMode()).toBe(false);
  });

  it('is true when WALKEROS_TELEMETRY_DEBUG=1', () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = '1';
    expect(isDebugMode()).toBe(true);
  });

  it('is true when WALKEROS_TELEMETRY_DEBUG=true', () => {
    process.env.WALKEROS_TELEMETRY_DEBUG = 'true';
    expect(isDebugMode()).toBe(true);
  });
});
