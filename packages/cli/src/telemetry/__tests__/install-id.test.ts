import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getInstallationId } from '../install-id.js';
import { readConfig, writeConfig } from '../../lib/config-file.js';

const testDir = join(tmpdir(), `install-id-test-${Date.now()}`);

describe('getInstallationId', () => {
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

  it('generates a UUID v4 on first call and persists it', () => {
    const id = getInstallationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(readConfig()?.installationId).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const first = getInstallationId();
    const second = getInstallationId();
    expect(second).toBe(first);
  });

  it('reuses an existing id from config', () => {
    writeConfig({ installationId: 'preset-abc' });
    expect(getInstallationId()).toBe('preset-abc');
  });
});
