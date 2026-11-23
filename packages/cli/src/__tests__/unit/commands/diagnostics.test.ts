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
import {
  SERVICE_APP,
  testCredential,
} from '../../helpers/service-credential.js';

const APP = 'https://app.example.test';
const AUTH = 'https://auth.example.test';
const env = process.env;
let configHome: string;
beforeEach(() => {
  configHome = mkdtempSync(join(tmpdir(), 'walkeros-diagnostics-'));
  process.env = { ...env, WALKEROS_APP_URL: APP, XDG_CONFIG_HOME: configHome };
  delete process.env.WALKEROS_CREDENTIAL;
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
      client_id: `${AUTH}/oauth/walkeros-cli`,
      token_endpoint: `${AUTH}/api/oauth/token`,
      revocation_endpoint: `${AUTH}/api/oauth/revoke`,
      access_token: 'wos_at_secret',
      expires_at: Date.now() + 3600_000,
      refresh_token: 'wos_rt_secret',
    };
    const lines = async () => {
      const report = await diagnostics();
      const text =
        JSON.stringify(report) + formatDiagnostics(report).join('\n');
      expect(text).not.toMatch(/wos_(at|rt)_secret|wos_cred_/);
      return formatDiagnostics(report)[3];
    };

    expect(await lines()).toBe('not signed in');
    writeCredentials({
      [AUTH]: { issuer: AUTH, resource: `${APP}/api`, ...login },
    });
    expect(await lines()).toBe(`signed in to ${AUTH}`);
    writeCredentials({
      'https://auth.stage.example.test': {
        issuer: 'https://auth.stage.example.test',
        resource: 'https://stage.example.test/api',
        ...login,
      },
    });
    expect(await lines()).toBe(
      `not signed in to ${APP} (signed in to https://auth.stage.example.test)`,
    );
    let pinged = 0;
    server.use(
      http.get(`${SERVICE_APP}/api/health`, () => {
        pinged += 1;
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    process.env.WALKEROS_CREDENTIAL = await testCredential();
    expect(await lines()).toBe(
      `WALKEROS_CREDENTIAL is for ${SERVICE_APP}, and WALKEROS_APP_URL names ${APP}`,
    );
    delete process.env.WALKEROS_APP_URL;
    expect(await lines()).toBe(
      `Credential: WALKEROS_CREDENTIAL, for ${SERVICE_APP}`,
    );
    // With a credential the report is of the credential's own app.
    expect((await diagnostics()).appUrl).toEqual({
      resolved: SERVICE_APP,
      source: 'credential',
    });
    expect(pinged).toBe(3);
    process.env.WALKEROS_CREDENTIAL = 'wos_cred_not-a-credential';
    expect(await lines()).toMatch(
      /^WALKEROS_CREDENTIAL is not a walkerOS credential/,
    );
  });

  it('names an unreachable app', async () => {
    server.use(http.get(`${APP}/api/health`, () => HttpResponse.error()));
    const report = await diagnostics();
    expect(report.app.reachable).toBe(false);
    expect(formatDiagnostics(report)[2]).toMatch(/^health unreachable \(/);
  });
});
