import { mkdirSync, rmSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getInstallationId, createInstallationId } from '../install-id.js';
import {
  readConfig,
  writeConfig,
  getConfigPath,
} from '../../lib/config-file.js';

const testDir = join(tmpdir(), `install-id-test-${Date.now()}`);

describe('getInstallationId (read-only)', () => {
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

  it('returns undefined when no config exists', () => {
    expect(getInstallationId()).toBeUndefined();
  });

  it('returns undefined when config has no installationId', () => {
    writeConfig({ token: 'x' });
    expect(getInstallationId()).toBeUndefined();
  });

  it('never writes to disk', () => {
    getInstallationId();
    expect(existsSync(getConfigPath())).toBe(false);
  });

  it('returns the stored id when present', () => {
    writeConfig({ installationId: 'fixed-uuid' });
    expect(getInstallationId()).toBe('fixed-uuid');
  });
});

describe('createInstallationId (opt-in path)', () => {
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

  it('generates a UUID and persists it when none exists', () => {
    const id = createInstallationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(readConfig()?.installationId).toBe(id);
  });

  it('returns the existing id without regenerating', () => {
    writeConfig({ installationId: 'existing' });
    expect(createInstallationId()).toBe('existing');
  });

  it('is idempotent across calls', () => {
    const a = createInstallationId();
    const b = createInstallationId();
    expect(a).toBe(b);
  });
});
