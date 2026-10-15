import '../../helpers/setup-msw.js';
import { server } from '../../helpers/msw-server.js';
import { http, HttpResponse } from 'msw';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { authTokenCommand } from '../../../commands/auth/index.js';
import { EXIT } from '../../../commands/api/index.js';

const APP = 'https://app.example.test';

function sink() {
  const chunks: string[] = [];
  return {
    stream: new Writable({
      write(chunk: Buffer, _e, done) {
        chunks.push(chunk.toString('utf-8'));
        done();
      },
    }),
    text: () => chunks.join(''),
  };
}

/** A config dir holding an expired session that must be refreshed. */
function expiredSession(): string {
  const home = mkdtempSync(join(tmpdir(), 'walkeros-token-'));
  mkdirSync(join(home, 'walkeros'));
  writeFileSync(
    join(home, 'walkeros', 'config.json'),
    JSON.stringify({
      accessToken: 'old',
      accessTokenExpiresAt: '2000-01-01T00:00:00.000Z',
      refreshToken: 'rt_1',
      appUrl: APP,
    }),
  );
  return home;
}

const env = process.env;
afterEach(() => {
  process.env = env;
});

describe('walkeros auth token', () => {
  it('prints WALKEROS_TOKEN', async () => {
    process.env = {
      ...env,
      WALKEROS_TOKEN: 'wos_pat_env',
      XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'walkeros-token-')),
    };
    const out = sink();
    expect(
      await authTokenCommand({ stdout: out.stream, stderr: sink().stream }),
    ).toBe(EXIT.ok);
    expect(out.text()).toBe('wos_pat_env\n');
  });

  it('prints the refreshed session token', async () => {
    process.env = {
      ...env,
      WALKEROS_APP_URL: APP,
      XDG_CONFIG_HOME: expiredSession(),
    };
    delete process.env.WALKEROS_TOKEN;
    server.use(
      http.post(`${APP}/api/oauth/token`, () =>
        HttpResponse.json({
          access_token: 'fresh',
          expires_in: 3600,
          refresh_token: 'rt_2',
        }),
      ),
    );
    const out = sink();
    expect(
      await authTokenCommand({ stdout: out.stream, stderr: sink().stream }),
    ).toBe(EXIT.ok);
    expect(out.text()).toBe('fresh\n');
  });

  it('exits 3 without a credential', async () => {
    process.env = {
      ...env,
      XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), 'walkeros-token-')),
    };
    delete process.env.WALKEROS_TOKEN;
    const err = sink();
    expect(
      await authTokenCommand({ stdout: sink().stream, stderr: err.stream }),
    ).toBe(EXIT.auth);
    expect(err.text()).toMatch(/walkeros auth login/);
  });

  it('exits 4 when the refresh cannot reach the app', async () => {
    process.env = {
      ...env,
      WALKEROS_APP_URL: APP,
      XDG_CONFIG_HOME: expiredSession(),
    };
    delete process.env.WALKEROS_TOKEN;
    server.use(http.post(`${APP}/api/oauth/token`, () => HttpResponse.error()));
    const err = sink();
    expect(
      await authTokenCommand({ stdout: sink().stream, stderr: err.stream }),
    ).toBe(EXIT.unreachable);
    expect(err.text()).toMatch(/Could not reach/);
  });
});
