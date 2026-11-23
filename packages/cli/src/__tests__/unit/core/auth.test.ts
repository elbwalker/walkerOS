import '../../helpers/setup-msw.js';
import { server } from '../../helpers/msw-server.js';
import { http, HttpResponse } from 'msw';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable, Writable } from 'stream';
import { resolveCredential } from '../../../core/auth.js';
import { EXIT, runApi } from '../../../commands/api/index.js';
import { writeCredentials } from '../../../lib/credentials.js';
import {
  SERVICE_APP,
  jwtClaims,
  serviceAuthServer,
  testCredential,
} from '../../helpers/service-credential.js';

const APP = 'https://app.example.test';
const AUTH = 'https://auth.example.test';

const LOGIN = {
  issuer: AUTH,
  resource: `${APP}/api`,
  client_id: `${AUTH}/oauth/walkeros-cli`,
  token_endpoint: `${AUTH}/api/oauth/token`,
  revocation_endpoint: `${AUTH}/api/oauth/revoke`,
  access_token: 'wos_at_login',
  expires_at: Date.now() + 3_600_000,
  refresh_token: 'wos_rt_login',
};

interface AppRequest {
  url: string;
  authorization: string | null;
  dpop: string | null;
}

/** The app at the credential's origin: every request recorded, each answered with `status`. */
function serviceApp(status: number): AppRequest[] {
  const seen: AppRequest[] = [];
  server.use(
    http.get(`${SERVICE_APP}/api/projects`, ({ request }) => {
      seen.push({
        url: request.url,
        authorization: request.headers.get('authorization'),
        dpop: request.headers.get('dpop'),
      });
      return HttpResponse.json(
        status === 200 ? { projects: [] } : { error: { message: 'refused' } },
        { status },
      );
    }),
  );
  return seen;
}

function io() {
  const err: string[] = [];
  return {
    stdout: new Writable({ write: (_c, _e, done) => done() }),
    stderr: new Writable({
      write: (chunk: Buffer, _e, done) => {
        err.push(chunk.toString('utf-8'));
        done();
      },
    }),
    stdin: Readable.from([]),
    err,
  };
}

const get = { method: 'GET', path: '/api/projects', header: [] };

describe('the credential a command sends', () => {
  const env = process.env;
  let configHome: string;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    configHome = mkdtempSync(join(tmpdir(), 'walkeros-auth-'));
    process.env = { ...env, XDG_CONFIG_HOME: configHome };
    delete process.env.WALKEROS_CREDENTIAL;
    delete process.env.WALKEROS_APP_URL;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = env;
    errorSpy.mockRestore();
    rmSync(configHome, { recursive: true, force: true });
  });

  it.each<[string, () => Promise<void>]>([
    [
      'WALKEROS_CREDENTIAL comes before a stored login, and is removed from the environment',
      async () => {
        writeCredentials({ [AUTH]: LOGIN });
        process.env.WALKEROS_CREDENTIAL = await testCredential();
        const credential = await resolveCredential(APP);
        expect(credential?.source).toBe('credential');
        expect(process.env.WALKEROS_CREDENTIAL).toBeUndefined();
      },
    ],
    [
      'without WALKEROS_CREDENTIAL the stored login is the credential',
      async () => {
        writeCredentials({ [AUTH]: LOGIN });
        expect(await resolveCredential(APP)).toEqual({
          source: 'login',
          token: 'wos_at_login',
          issuer: AUTH,
        });
      },
    ],
    [
      'a set WALKEROS_TOKEN changes nothing',
      async () => {
        process.env.WALKEROS_TOKEN = 'wos_pat_left_over';
        expect(await resolveCredential(APP)).toBeNull();
        writeCredentials({ [AUTH]: LOGIN });
        expect((await resolveCredential(APP))?.source).toBe('login');
      },
    ],
    [
      'walkeros api sends a DPoP token and its proof for that request, to the app the credential names',
      async () => {
        process.env.WALKEROS_CREDENTIAL = await testCredential();
        const auth = serviceAuthServer();
        server.use(...auth.handlers);
        const seen = serviceApp(200);

        expect(await runApi(get, io())).toBe(EXIT.ok);

        expect(seen).toHaveLength(1);
        expect(seen[0]?.url).toBe(`${SERVICE_APP}/api/projects`);
        expect(seen[0]?.authorization).toBe('DPoP tok-1');
        expect(jwtClaims(seen[0]?.dpop ?? '')).toEqual(
          expect.objectContaining({
            htm: 'GET',
            htu: `${SERVICE_APP}/api/projects`,
            ath: expect.any(String),
          }),
        );
        expect(auth.tokenRequests[0]?.dpop).toEqual(expect.any(String));
      },
    ],
    [
      'a credential for another app than WALKEROS_APP_URL exits 1 naming both, and sends nothing',
      async () => {
        process.env.WALKEROS_APP_URL = APP;
        process.env.WALKEROS_CREDENTIAL = await testCredential();
        const auth = serviceAuthServer();
        server.use(...auth.handlers);
        const seen = serviceApp(200);
        const streams = io();

        expect(await runApi(get, streams)).toBe(1);

        expect(streams.err.join('')).toBe(
          `walkeros api: WALKEROS_CREDENTIAL is for ${SERVICE_APP}, and WALKEROS_APP_URL names ${APP}\n`,
        );
        expect(seen).toEqual([]);
        expect(auth.tokenRequests).toEqual([]);
      },
    ],
    [
      'a 401 from the app buys once more and sends once more, never twice',
      async () => {
        process.env.WALKEROS_CREDENTIAL = await testCredential();
        const auth = serviceAuthServer();
        server.use(...auth.handlers);
        const seen = serviceApp(401);

        const streams = io();

        expect(await runApi(get, streams)).toBe(EXIT.auth);

        expect(seen.map((request) => request.authorization)).toEqual([
          'DPoP tok-1',
          'DPoP tok-2',
        ]);
        expect(auth.tokenRequests).toHaveLength(2);
        // One line for the refusal, the client's; the command adds none.
        expect(streams.err).toEqual([]);
        expect(
          errorSpy.mock.calls.filter((call) =>
            String(call[0]).includes("refused this automation's credential"),
          ),
        ).toHaveLength(1);
      },
    ],
  ])('%s', async (_name, run) => {
    await run();
  });
});
