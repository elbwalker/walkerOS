import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveAccessToken } from '../../../core/auth.js';

describe('resolveAccessToken', () => {
  let dir: string;
  const originalEnv = process.env;

  /** Writes raw JSON where the CLI keeps its config, as an older CLI left it. */
  function writeLegacyConfig(content: Record<string, unknown>): void {
    mkdirSync(join(dir, 'walkeros'), { recursive: true });
    writeFileSync(
      join(dir, 'walkeros', 'config.json'),
      JSON.stringify(content),
    );
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-auth-'));
    process.env = { ...originalEnv, XDG_CONFIG_HOME: dir };
    delete process.env.WALKEROS_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns WALKEROS_TOKEN', () => {
    process.env.WALKEROS_TOKEN = 'tok';
    expect(resolveAccessToken()).toBe('tok');
  });

  it('ignores a stored session and a legacy token in the config file', () => {
    writeLegacyConfig({
      token: 'legacy',
      accessToken: 'a',
      accessTokenExpiresAt: '2999-01-01T00:00:00.000Z',
      refreshToken: 'r',
    });
    expect(resolveAccessToken()).toBeNull();
  });
});
