import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { logout } from '../../../commands/logout/index.js';
import { revokeRefreshToken } from '../../../core/oauth-client.js';
import { readConfig, writeConfig } from '../../../lib/config-file.js';

jest.mock('../../../core/oauth-client.js', () => ({
  revokeRefreshToken: jest.fn(async () => undefined),
}));

const mockRevoke = jest.mocked(revokeRefreshToken);

describe('logout', () => {
  let dir: string;
  const originalEnv = process.env;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-logout-'));
    process.env = { ...originalEnv };
    process.env.XDG_CONFIG_HOME = dir;
    delete process.env.WALKEROS_APP_URL;
    mockRevoke.mockImplementation(async () => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(dir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('revokes the stored refresh token, then deletes the config', async () => {
    writeConfig({ accessToken: 'at_1', refreshToken: 'rt_1' });

    await expect(logout()).resolves.toEqual({
      deleted: true,
      superseded: false,
    });
    expect(mockRevoke).toHaveBeenCalledWith('https://app.walkeros.io', 'rt_1');
    expect(readConfig()).toBeNull();
  });

  it('reports nothing to delete when no config exists', async () => {
    await expect(logout()).resolves.toEqual({
      deleted: false,
      superseded: false,
    });
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('keeps a session that was stored while the revocation was in flight', async () => {
    writeConfig({ accessToken: 'at_1', refreshToken: 'rt_1' });
    // A login finishing inside the revocation round trip. Deleting the file
    // afterwards would take a session this logout never saw.
    mockRevoke.mockImplementation(async () => {
      writeConfig({ accessToken: 'at_2', refreshToken: 'rt_2' });
    });

    await expect(logout()).resolves.toEqual({
      deleted: false,
      superseded: true,
    });
    expect(readConfig()?.refreshToken).toBe('rt_2');
  });

  it('deletes when the config came back unchanged', async () => {
    writeConfig({ accessToken: 'at_1', refreshToken: 'rt_1' });
    // A write that touches something other than the session is not a login.
    mockRevoke.mockImplementation(async () => {
      writeConfig({ defaultProjectId: 'proj_1' });
    });

    await expect(logout()).resolves.toEqual({
      deleted: true,
      superseded: false,
    });
    expect(readConfig()).toBeNull();
  });
});
