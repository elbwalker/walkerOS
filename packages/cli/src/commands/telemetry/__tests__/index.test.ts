import { mkdirSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  telemetryStatusCommand,
  telemetryEnableCommand,
  telemetryDisableCommand,
} from '../index.js';
import {
  readConfig,
  writeConfig,
  getConfigPath,
} from '../../../lib/config-file.js';

const testDir = join(tmpdir(), `telemetry-cmd-test-${Date.now()}`);

describe('telemetry commands', () => {
  const originalEnv = process.env;
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
    const p = getConfigPath();
    if (existsSync(p)) unlinkSync(p);
    delete process.env.DO_NOT_TRACK;
    delete process.env.WALKEROS_TELEMETRY_DISABLED;
    stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
    stdoutSpy.mockRestore();
  });

  function stdoutText(): string {
    return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
  }

  describe('telemetryStatusCommand', () => {
    it('reports "not yet chosen" when no config exists', () => {
      telemetryStatusCommand();
      expect(stdoutText()).toMatch(/not yet/i);
      expect(stdoutText()).toMatch(/walkeros telemetry enable/);
    });

    it('reports "not yet chosen" when config exists but field is absent', () => {
      writeConfig({ token: 'x' });
      telemetryStatusCommand();
      expect(stdoutText()).toMatch(/not yet/i);
    });

    it('reports "enabled" when telemetryEnabled is true', () => {
      writeConfig({ telemetryEnabled: true, installationId: 'u' });
      telemetryStatusCommand();
      expect(stdoutText()).toMatch(/enabled/i);
      expect(stdoutText()).not.toMatch(/not yet/i);
    });

    it('reports "disabled" when telemetryEnabled is false', () => {
      writeConfig({ telemetryEnabled: false });
      telemetryStatusCommand();
      expect(stdoutText()).toMatch(/disabled/i);
    });

    it('reports env override when DO_NOT_TRACK is set', () => {
      writeConfig({ telemetryEnabled: true, installationId: 'u' });
      process.env.DO_NOT_TRACK = '1';
      telemetryStatusCommand();
      expect(stdoutText()).toMatch(/DO_NOT_TRACK/);
    });
  });

  describe('telemetryEnableCommand', () => {
    it('persists telemetryEnabled=true and a fresh installation id', () => {
      telemetryEnableCommand();
      const cfg = readConfig();
      expect(cfg?.telemetryEnabled).toBe(true);
      expect(cfg?.installationId).toMatch(/[0-9a-f-]{36}/);
      expect(stdoutText()).toMatch(/enabled/i);
    });

    it('keeps an existing installation id when re-enabling', () => {
      writeConfig({ installationId: 'existing' });
      telemetryEnableCommand();
      expect(readConfig()?.installationId).toBe('existing');
    });
  });

  describe('telemetryDisableCommand', () => {
    it('persists telemetryEnabled=false', () => {
      telemetryDisableCommand();
      expect(readConfig()?.telemetryEnabled).toBe(false);
      expect(stdoutText()).toMatch(/disabled/i);
    });

    it('does not create an installation id on disable', () => {
      telemetryDisableCommand();
      expect(readConfig()?.installationId).toBeUndefined();
    });

    it('preserves an existing installation id if one was already present', () => {
      writeConfig({ installationId: 'existing', telemetryEnabled: true });
      telemetryDisableCommand();
      expect(readConfig()?.installationId).toBe('existing');
      expect(readConfig()?.telemetryEnabled).toBe(false);
    });
  });
});
