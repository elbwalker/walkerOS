import { createServer, request } from 'http';
import { connect } from 'net';
import { networkInterfaces } from 'os';
import {
  DONE_PAGE,
  FAILED_PAGE,
  listenForCallback,
  type CallbackListener,
} from '../../../core/login-listener.js';

const ISSUER = 'http://localhost:3000';
const STATE = 'aBcD_eFgH-1234567890abcdefghijkl';
const CODE = 'a'.repeat(64);

let listener: CallbackListener | undefined;

afterEach(() => {
  listener?.close();
  listener = undefined;
});

async function listen(timeoutMs = 60_000): Promise<CallbackListener> {
  listener = await listenForCallback({
    port: 0,
    state: STATE,
    issuer: ISSUER,
    timeoutMs,
  });
  return listener;
}

/** A GET that never follows a redirect, as a test reads the answer itself. */
function get(url: string): Promise<{
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    request(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf-8'),
        }),
      );
    })
      .on('error', reject)
      .end();
  });
}

function callback(l: CallbackListener, query: Record<string, string>): string {
  return `${l.redirectUri}?${new URLSearchParams(query).toString()}`;
}

describe('the loopback listener', () => {
  it('binds 127.0.0.1 only', async () => {
    const l = await listen();
    expect(l.redirectUri).toBe(`http://127.0.0.1:${l.port}/callback`);
    const external = Object.values(networkInterfaces())
      .flat()
      .find((i) => i !== undefined && i.family === 'IPv4' && !i.internal);
    if (external === undefined) return;
    const refused = await new Promise<boolean>((resolve) => {
      const socket = connect(l.port, external.address);
      socket.once('connect', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => resolve(true));
    });
    expect(refused).toBe(true);
  });

  it('ignores a request with the wrong state and keeps waiting for the real one', async () => {
    const l = await listen();
    const wrong = await get(
      callback(l, { code: CODE, state: 'x', iss: ISSUER }),
    );
    const forged = await get(
      callback(l, { error: 'access_denied', state: 'x' }),
    );
    expect([wrong.status, forged.status]).toEqual([400, 400]);
    const real = get(callback(l, { code: CODE, state: STATE, iss: ISSUER }));
    await expect(l.code).resolves.toBe(CODE);
    l.finish(true);
    expect((await real).status).toBe(303);
  });

  it('answers 404 to anything but GET /callback', async () => {
    const l = await listen();
    const favicon = await get(`http://127.0.0.1:${l.port}/favicon.ico`);
    const done = await get(`http://127.0.0.1:${l.port}/callback/done`);
    expect([favicon.status, done.status]).toEqual([404, 404]);
  });

  it('answers a valid callback with a 303 to a clean address and a static page that echoes nothing', async () => {
    const l = await listen();
    const answered = get(
      callback(l, { code: CODE, state: STATE, iss: ISSUER }),
    );
    await l.code;
    l.finish(true);
    const redirect = await answered;
    expect(redirect.status).toBe(303);
    expect(redirect.headers.location).toBe('/callback/done');

    const page = await get(`http://127.0.0.1:${l.port}/callback/done`);
    expect(page.status).toBe(200);
    expect(page.body).toBe(DONE_PAGE);
    expect(page.body).not.toMatch(/src=|href=/);
    expect(page.body).not.toContain(CODE);
    expect(page.body).not.toContain(STATE);
    expect(page.headers['cache-control']).toBe('no-store');
    expect(page.headers['referrer-policy']).toBe('no-referrer');
    expect(FAILED_PAGE).not.toMatch(/src=|href=/);
  });

  it.each([
    [
      'an error answer',
      { error: 'access_denied', state: STATE, iss: ISSUER },
      'the sign-in did not finish',
    ],
    [
      'another issuer',
      { code: CODE, state: STATE, iss: 'https://evil.example' },
      'from another sign-in than http://localhost:3000, so no code was exchanged',
    ],
    ['no issuer', { code: CODE, state: STATE }, 'so no code was exchanged'],
  ])(
    'ends the sign-in on %s with the right state, and exchanges no code',
    async (_name, query, message) => {
      const l = await listen();
      const answered = await get(callback(l, query));
      expect(answered.status).toBe(303);
      expect(answered.headers.location).toBe('/callback/failed');
      await expect(l.code).rejects.toThrow(message);
    },
  );

  it('gives up after its timeout, naming --no-browser', async () => {
    const l = await listen(200);
    await expect(l.code).rejects.toThrow(
      'no sign-in arrived within 200 ms: if the browser showed a connection error, run walkeros login --no-browser',
    );
  });

  it('says which port is taken and how to choose another', async () => {
    const taken = createServer();
    await new Promise<void>((resolve) => taken.listen(0, '127.0.0.1', resolve));
    const address = taken.address();
    const port =
      address !== null && typeof address === 'object' ? address.port : 0;
    try {
      await expect(
        listenForCallback({
          port,
          state: STATE,
          issuer: ISSUER,
          timeoutMs: 1000,
        }),
      ).rejects.toThrow(
        `port ${port} on 127.0.0.1 is in use: choose another with --port <n> or WALKEROS_LOGIN_PORT`,
      );
    } finally {
      await new Promise((resolve) => taken.close(resolve));
    }
  });
});
