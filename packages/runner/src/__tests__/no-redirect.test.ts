/**
 * The runner's app calls follow no redirect: the app's origin answers each
 * call with a 307 to another origin over real HTTP, and the other origin must
 * see nothing. A redirect would carry the DPoP proof, the signature and, on a
 * 307, the body: fetch drops only Authorization on a cross-origin hop.
 */

import { createServer, type Server, type ServerResponse } from 'http';
import type { Logger } from '@walkeros/core';
import type { AppAuth } from '../credentials.js';
import { createHeartbeat } from '../heartbeat.js';
import { fetchSecrets } from '../secrets-fetcher.js';

const CREDENTIAL_HEADERS = {
  Authorization: 'DPoP tok',
  DPoP: 'proof',
  'Signature-Input': 'sig1=("@method" "@target-uri" "content-digest")',
  Signature: 'sig1=:c2ln:',
  'Content-Digest': 'sha-256=:ZGln:',
};

/** One HTTP server on 127.0.0.1, its origin and the requests it got. */
async function listen(
  answer: (res: ServerResponse) => void,
): Promise<{ server: Server; origin: string; seen: string[][] }> {
  const seen: string[][] = [];
  const server = createServer((req, res) => {
    seen.push(Object.keys(req.headers));
    req.resume();
    answer(res);
  });
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('the server has no port');
  return { server, origin: `http://127.0.0.1:${address.port}`, seen };
}

function silentLogger(): Logger.Instance {
  const logger: Logger.Instance = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: (message: string | Error): never => {
      throw new Error(String(message));
    },
    json: jest.fn(),
    mask: (text: string) => text,
    scope: () => logger,
  };
  return logger;
}

describe('the runner follows no redirect with its credential', () => {
  let elsewhere: Awaited<ReturnType<typeof listen>>;
  let app: Awaited<ReturnType<typeof listen>>;
  /** The redirect the app answers with; each row sets it. */
  let status = 307;

  beforeEach(async () => {
    elsewhere = await listen((res) => res.end('{}'));
    const target = elsewhere.origin;
    app = await listen((res) => {
      res.writeHead(status, { Location: `${target}/took-it` });
      res.end();
    });
  });

  afterEach(async () => {
    await Promise.all(
      [app.server, elsewhere.server].map(
        (server) => new Promise((resolve) => server.close(resolve)),
      ),
    );
  });

  function appAuth(): AppAuth {
    return {
      origin: app.origin,
      authorize: async () => ({ ...CREDENTIAL_HEADERS }),
      answered: () => false,
    };
  }

  const checkIn = () =>
    createHeartbeat(
      { app: appAuth(), instanceId: '3f9a2b7c1d4e5f60', intervalMs: 60_000 },
      silentLogger(),
    ).sendOnce();
  const secretRead = () =>
    fetchSecrets({ app: appAuth() }).catch((error: unknown) => error);

  // A 302 turns the check-in's POST into a GET that carries the headers on.
  it.each<[string, number, () => Promise<unknown>]>([
    ['the check-in', 302, checkIn],
    ['the check-in', 307, checkIn],
    ['the secret read', 302, secretRead],
    ['the secret read', 307, secretRead],
  ])(
    '%s answered %i reaches the app once and sends nothing to the redirect target',
    async (_name, redirect, call) => {
      status = redirect;
      await call();
      expect(app.seen).toHaveLength(1);
      expect(app.seen[0]).toEqual(expect.arrayContaining(['dpop']));
      expect(elsewhere.seen).toEqual([]);
    },
  );
});
