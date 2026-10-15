import {
  readFileSync,
  readdirSync,
  rmSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  readConfig,
  writeConfig,
  writeTelemetryOnlyConfig,
  hasStoredCredential,
  getConfigPath,
  type WalkerOSConfig,
} from '../../../lib/config-file.js';

const testDir = join(tmpdir(), `config-file-test-${Date.now()}`);

describe('hasStoredCredential', () => {
  const cases: Array<[string, WalkerOSConfig | null, boolean]> = [
    ['a legacy static token', { token: 'sk' }, true],
    ['an OAuth access token', { accessToken: 'at' }, true],
    ['a telemetry-only config', { telemetryEnabled: true }, false],
    ['no config', null, false],
  ];
  it.each(cases)('%s', (_label, config, expected) => {
    expect(hasStoredCredential(config)).toBe(expected);
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

describe('config-file permissions', () => {
  // Its own temp root, and deliberately NOT pre-created: the directory mode is
  // one of the guarantees under test, and mkdirSync only applies a mode to a
  // directory it creates.
  const modeDir = join(tmpdir(), `config-file-mode-test-${Date.now()}`);
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, XDG_CONFIG_HOME: modeDir };
    rmSync(modeDir, { recursive: true, force: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(modeDir, { recursive: true, force: true });
  });

  function modeOf(path: string): number {
    return statSync(path).mode & 0o777;
  }

  it('writes the config readable only by its owner', () => {
    writeConfig({ token: 'sk-test-123' });
    expect(modeOf(getConfigPath())).toBe(0o600);
  });

  it('creates the config directory traversable only by its owner', () => {
    writeConfig({ token: 'sk-test-123' });
    expect(modeOf(join(modeDir, 'walkeros'))).toBe(0o700);
  });

  it('writes through a temp path of its own, leaving another writer\u2019s alone', () => {
    // Only the token refresh takes the config lock, so two ordinary writers
    // (a login and a `telemetry enable`, say) can be in here at once. On one
    // shared name they would write over each other's temp file and rename it
    // twice, and the slower one would fail outright when the faster renamed
    // the file out from under its `chmod`.
    mkdirSync(join(modeDir, 'walkeros'), { recursive: true });
    const otherWriterTemp = `${getConfigPath()}.tmp`;
    writeFileSync(otherWriterTemp, 'another writer');

    writeConfig({ token: 'sk-test-123' });

    expect(readFileSync(otherWriterTemp, 'utf-8')).toBe('another writer');
    expect(modeOf(getConfigPath())).toBe(0o600);
    expect(readConfig()?.token).toBe('sk-test-123');
  });

  it('leaves no temp file behind', () => {
    writeConfig({ token: 'sk-test-123' });
    writeConfig({ token: 'sk-test-456' });

    expect(readdirSync(join(modeDir, 'walkeros'))).toEqual(['config.json']);
  });
});
