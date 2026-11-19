/**
 * `walkeros api` with WALKEROS_CREDENTIAL follows no redirect, over real
 * HTTP: one server on 127.0.0.1 is the auth server and the app, and the app
 * answers with a redirect to a second origin, which must see nothing. A
 * followed redirect would carry the DPoP proof on (fetch drops only
 * Authorization on a cross-origin hop).
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'http';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable, Writable } from 'stream';
import { EXIT, runApi } from '../../../commands/api/index.js';
import { testCredential } from '../../helpers/service-credential.js';

interface Seen {
  path: string;
  headers: string[];
}

/** One HTTP server on 127.0.0.1, its origin and the requests it got. */
async function listen(
  answer: (req: IncomingMessage, res: ServerResponse, origin: string) => void,
): Promise<{ server: Server; origin: string; seen: Seen[] }> {
  const seen: Seen[] = [];
  let origin = '';
  const server = createServer((req, res) => {
    seen.push({ path: req.url ?? '', headers: Object.keys(req.headers) });
    req.resume();
    answer(req, res, origin);
  });
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('the server has no port');
  origin = `http://127.0.0.1:${address.port}`;
  return { server, origin, seen };
}

function json(res: ServerResponse, value: unknown): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(value));
}

describe('walkeros api with WALKEROS_CREDENTIAL follows no redirect', () => {
  const env = process.env;
  let elsewhere: Awaited<ReturnType<typeof listen>>;
  let app: Awaited<ReturnType<typeof listen>>;
  let configHome: string;
  /** The redirect the app answers with; each row sets it. */
  let status = 307;

  beforeEach(async () => {
    elsewhere = await listen((_req, res) => json(res, {}));
    app = await listen((req, res, origin) => {
      if (req.url === '/.well-known/oauth-authorization-server')
        return json(res, {
          issuer: origin,
          service_token_endpoint: `${origin}/api/services/token`,
          dpop_signing_alg_values_supported: ['ES256'],
        });
      if (req.url === '/api/services/token')
        return json(res, {
          access_token: 'tok-1',
          token_type: 'DPoP',
          expires_in: 86400,
          scope: 'read',
        });
      res.writeHead(status, { Location: `${elsewhere.origin}/took-it` });
      res.end();
    });
    configHome = mkdtempSync(join(tmpdir(), 'walkeros-redirect-'));
    process.env = { ...env, XDG_CONFIG_HOME: configHome };
    delete process.env.WALKEROS_APP_URL;
    process.env.WALKEROS_CREDENTIAL = await testCredential('automation', {
      issuer: app.origin,
      app: app.origin,
    });
  });

  afterEach(async () => {
    process.env = env;
    rmSync(configHome, { recursive: true, force: true });
    await Promise.all(
      [app.server, elsewhere.server].map(
        (server) => new Promise((resolve) => server.close(resolve)),
      ),
    );
  });

  it.each([302, 307])(
    'answered %i: the app got the request with its proof, the target nothing, and the command exits 1',
    async (redirect) => {
      status = redirect;
      const err: string[] = [];
      const io = {
        stdout: new Writable({ write: (_c, _e, done) => done() }),
        stderr: new Writable({
          write: (chunk: Buffer, _e, done) => {
            err.push(chunk.toString('utf-8'));
            done();
          },
        }),
        stdin: Readable.from([]),
      };

      const exit = await runApi(
        { method: 'POST', path: '/api/projects', data: '{}', header: [] },
        io,
      );

      expect(exit).toBe(EXIT.http);
      expect(err.join('')).toMatch(
        new RegExp(`^walkeros api: HTTP ${redirect}`),
      );
      const calls = app.seen.filter((s) => s.path === '/api/projects');
      expect(calls).toHaveLength(1);
      expect(calls[0]?.headers).toEqual(expect.arrayContaining(['dpop']));
      expect(elsewhere.seen).toEqual([]);
    },
  );
});
