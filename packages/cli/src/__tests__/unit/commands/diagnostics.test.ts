import '../../helpers/setup-msw.js';
import { server } from '../../helpers/msw-server.js';
import { http, HttpResponse } from 'msw';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  diagnostics,
  formatDiagnostics,
} from '../../../commands/diagnostics/index.js';
import { writeCredentials } from '../../../lib/credentials.js';

const APP = 'https://app.example.test';
const env = process.env;
let configHome: string;
beforeEach(() => {
  configHome = mkdtempSync(join(tmpdir(), 'walkeros-diagnostics-'));
  process.env = { ...env, WALKEROS_APP_URL: APP, XDG_CONFIG_HOME: configHome };
  delete process.env.WALKEROS_TOKEN;
});
afterEach(() => {
  process.env = env;
  rmSync(configHome, { recursive: true, force: true });
});

describe('walkeros diagnostics', () => {
  it('reports the CLI version, the app URL with its source, a health ping and the sign-in, nothing else', async () => {
    let authorization: string | null = 'unset';
    server.use(
      http.get(`${APP}/api/health`, ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({ status: 'ok', appVersion: 'abc123' });
      }),
    );
    const report = await diagnostics();
    expect(Object.keys(report).sort()).toEqual([
      'app',
      'appUrl',
      'cli',
      'signIn',
    ]);
    expect(report.appUrl).toEqual({ resolved: APP, source: 'env' });
    expect(report.app).toEqual({
      reachable: true,
      status: 'ok',
      appVersion: 'abc123',
    });
    expect(authorization).toBeNull();
    expect(formatDiagnostics(report)).toHaveLength(4);
  });

  it('says where a command would be signed in, and never shows a token', async () => {
    server.use(
      http.get(`${APP}/api/health`, () => HttpResponse.json({ status: 'ok' })),
    );
    const login = {
      client_id: `${APP}/oauth/walkeros-cli`,
      token_endpoint: `${APP}/api/oauth/token`,
      revocation_endpoint: `${APP}/api/oauth/revoke`,
      access_token: 'wos_at_secret',
      expires_at: Date.now() + 3600_000,
      refresh_token: 'wos_rt_secret',
    };
    const lines = async () => {
      const report = await diagnostics();
      const text =
        JSON.stringify(report) + formatDiagnostics(report).join('\n');
      expect(text).not.toMatch(/wos_(at|rt|pat)_secret/);
      return formatDiagnostics(report)[3];
    };

    expect(await lines()).toBe('not signed in');
    writeCredentials({ [APP]: { issuer: APP, ...login } });
    expect(await lines()).toBe(`signed in to ${APP}`);
    writeCredentials({
      'https://stage.example.test': {
        issuer: 'https://stage.example.test',
        ...login,
      },
    });
    expect(await lines()).toBe(
      `not signed in to ${APP} (signed in to https://stage.example.test)`,
    );
    process.env.WALKEROS_TOKEN = 'wos_pat_secret';
    expect(await lines()).toBe('sign-in WALKEROS_TOKEN');
  });

  it('names an unreachable app', async () => {
    server.use(http.get(`${APP}/api/health`, () => HttpResponse.error()));
    const report = await diagnostics();
    expect(report.app.reachable).toBe(false);
    expect(formatDiagnostics(report)[2]).toMatch(/^health unreachable \(/);
  });
});
