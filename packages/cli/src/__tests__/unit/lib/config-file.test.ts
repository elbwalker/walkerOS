import { readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readConfig,
  writeConfig,
  writeTelemetryOnlyConfig,
  setDefaultProject,
  getDefaultProject,
  setFeedbackPreference,
  getFeedbackPreference,
  getConfigPath,
} from '../../../lib/config-file.js';

const testDir = join(tmpdir(), `config-file-test-${Date.now()}`);

const baseConfig = {
  token: 'sk-test-123',
  email: 'test@example.com',
  appUrl: 'https://app.walkeros.io',
};

describe('config-file feedbackPreference', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('setFeedbackPreference', () => {
    it('writes preference to existing config', () => {
      writeConfig(baseConfig);
      setFeedbackPreference(true);

      const raw = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
      expect(raw.anonymousFeedback).toBe(true);
    });

    it('does nothing when no config exists', () => {
      setFeedbackPreference(false);

      expect(readConfig()).toBeNull();
    });
  });

  describe('getFeedbackPreference', () => {
    it('returns stored preference', () => {
      writeConfig({ ...baseConfig, anonymousFeedback: false });
      expect(getFeedbackPreference()).toBe(false);
    });

    it('returns undefined when not set', () => {
      writeConfig(baseConfig);
      expect(getFeedbackPreference()).toBeUndefined();
    });
  });
});

describe('config-file defaultProject', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Redirect XDG_CONFIG_HOME so getConfigDir() points to our temp dir.
    // getConfigDir returns join(XDG_CONFIG_HOME, 'walkeros'), so we set
    // XDG_CONFIG_HOME to testDir and the config lands in testDir/walkeros/.
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('setDefaultProject', () => {
    it('writes projectId to config', () => {
      writeConfig(baseConfig);
      setDefaultProject('proj_abc');

      const raw = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
      expect(raw.defaultProjectId).toBe('proj_abc');
    });

    it('preserves existing config fields', () => {
      writeConfig({ ...baseConfig, anonymousFeedback: true });
      setDefaultProject('proj_xyz');

      const raw = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
      expect(raw.token).toBe(baseConfig.token);
      expect(raw.email).toBe(baseConfig.email);
      expect(raw.appUrl).toBe(baseConfig.appUrl);
      expect(raw.anonymousFeedback).toBe(true);
      expect(raw.defaultProjectId).toBe('proj_xyz');
    });

    it('throws when not authenticated (no config)', () => {
      expect(() => setDefaultProject('proj_abc')).toThrow('Not authenticated');
    });
  });

  describe('getDefaultProject', () => {
    it('returns stored projectId', () => {
      writeConfig({ ...baseConfig, defaultProjectId: 'proj_abc' });
      expect(getDefaultProject()).toBe('proj_abc');
    });

    it('returns null when not set', () => {
      writeConfig(baseConfig);
      expect(getDefaultProject()).toBeNull();
    });

    it('returns null when no config exists', () => {
      expect(getDefaultProject()).toBeNull();
    });
  });
});

describe('WalkerOSConfig telemetry fields', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, XDG_CONFIG_HOME: testDir };
    mkdirSync(join(testDir, 'walkeros'), { recursive: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(testDir, { recursive: true, force: true });
  });

  it('persists installationId and telemetryEnabled through write/read', () => {
    writeConfig({
      token: 't',
      email: 'e',
      appUrl: 'u',
      installationId: 'abc-123',
      telemetryEnabled: false,
    });
    const cfg = readConfig();
    expect(cfg?.installationId).toBe('abc-123');
    expect(cfg?.telemetryEnabled).toBe(false);
  });

  it('allows telemetry-only config without token/email (anonymous install)', () => {
    writeTelemetryOnlyConfig({ installationId: 'xyz-789' });
    const cfg = readConfig();
    expect(cfg?.installationId).toBe('xyz-789');
    expect(cfg?.token).toBeUndefined();
  });
});
