import { mkdirSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { isTelemetryEnabled, isDebugMode } from '../consent.js';
import { writeConfig, getConfigPath } from '../../lib/config-file.js';

const testDir = join(tmpdir(), `consent-test-${Date.now()}`);

describe('isTelemetryEnabled', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
    const p = getConfigPath();
    if (existsSync(p)) unlinkSync(p);
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('is disabled by default (no config)', () => {
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is disabled when config exists but telemetryEnabled is absent', () => {
    writeConfig({ token: 'x' });
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is disabled when telemetryEnabled is explicitly false', () => {
    writeConfig({ telemetryEnabled: false });
    expect(isTelemetryEnabled()).toBe(false);
  });

  it('is enabled only when telemetryEnabled is true', () => {
    writeConfig({ telemetryEnabled: true });
    expect(isTelemetryEnabled()).toBe(true);
  });

  it('respects legacy DO_NOT_TRACK as a forced-off override', () => {
    writeConfig({ telemetryEnabled: true });
    process.env.DO_NOT_TRACK = '1';
    expect(isTelemetryEnabled()).toBe(false);
    delete process.env.DO_NOT_TRACK;
  });

  it('respects legacy WALKEROS_TELEMETRY_DISABLED as a forced-off override', () => {
    writeConfig({ telemetryEnabled: true });
    process.env.WALKEROS_TELEMETRY_DISABLED = '1';
    expect(isTelemetryEnabled()).toBe(false);
    delete process.env.WALKEROS_TELEMETRY_DISABLED;
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
});
