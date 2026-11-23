import { createServer, type ServerResponse } from 'http';
import { timingSafeEqual } from 'crypto';
import { CODE_SHAPE, LoginError } from './oauth-login.js';

/**
 * The loopback listener of `walkeros login`: the browser returns here after
 * Allow, on `http://127.0.0.1:<port>/callback` (RFC 8252 7.3).
 *
 * Any web page the person has open can send requests to this port, so the
 * listener trusts nothing until `state` matches: a request with another
 * `state` is answered 400 and ignored, and the listener keeps waiting for the
 * real sign-in. Only `GET /callback` is read; anything else is 404 (the
 * browser asks for `/favicon.ico` too).
 *
 * A valid callback is answered with a 303 to `/callback/done` (or
 * `/callback/failed`) on the listener itself, so the code, `state` and `iss`
 * leave the address bar and the history entry. Those two pages are static and
 * self-contained: no external resource whose Referer could carry the callback
 * address, and nothing from the query echoed.
 */

export const DONE_PATH = '/callback/done';
export const FAILED_PATH = '/callback/failed';

const PAGE_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

function page(text: string): string {
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>walkerOS CLI</title></head><body><p>${text}</p></body></html>\n`;
}

export const DONE_PAGE = page(
  'walkerOS CLI: signed in. You can close this tab.',
);
export const FAILED_PAGE = page(
  'walkerOS CLI: the sign-in did not finish. See the terminal.',
);

/** How long the listener stays up for the done page after it answered the callback. */
const DONE_GRACE_MS = 3000;

function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function answer(
  res: ServerResponse,
  status: number,
  body: string,
  type = 'text/plain; charset=utf-8',
): void {
  res.writeHead(status, { ...PAGE_HEADERS, 'Content-Type': type });
  res.end(body);
}

export interface CallbackListener {
  port: number;
  /** The exact return address to send in the authorization and token requests. */
  redirectUri: string;
  /**
   * The code of the first callback with the right `state` and `iss`. Rejects
   * on the app's error answer, on another issuer, and at the timeout.
   */
  code: Promise<string>;
  /** Answer the held callback: a 303 to the done or the failed page. */
  finish(signedIn: boolean): void;
  close(): void;
}

export interface ListenOptions {
  /** 0 picks a free port. */
  port: number;
  state: string;
  issuer: string;
  timeoutMs: number;
}

export function timeoutMessage(ms: number): string {
  const wait = ms % 60_000 === 0 ? `${ms / 60_000} minutes` : `${ms} ms`;
  return `no sign-in arrived within ${wait}: if the browser showed a connection error, run walkeros login --no-browser`;
}

/** Listen on 127.0.0.1 only, never on another interface. */
export function listenForCallback(
  options: ListenOptions,
): Promise<CallbackListener> {
  let resolveCode: (code: string) => void = () => {};
  let rejectCode: (error: Error) => void = () => {};
  const code = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });
  // A rejection nobody awaited yet (the timeout before the caller awaits)
  // must not end the process as unhandled.
  code.catch(() => undefined);

  let held: ServerResponse | null = null;
  let outcome: 'waiting' | 'held' | 'done' | 'failed' = 'waiting';
  let timer: NodeJS.Timeout | undefined;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (req.method !== 'GET') return answer(res, 404, 'Not found');

    if (url.pathname === DONE_PATH || url.pathname === FAILED_PATH) {
      const wanted = url.pathname === DONE_PATH ? 'done' : 'failed';
      if (outcome !== wanted) return answer(res, 404, 'Not found');
      res.on('finish', close);
      return answer(
        res,
        200,
        wanted === 'done' ? DONE_PAGE : FAILED_PAGE,
        'text/html; charset=utf-8',
      );
    }
    if (url.pathname !== '/callback') return answer(res, 404, 'Not found');

    const state = url.searchParams.get('state');
    if (
      outcome !== 'waiting' ||
      state === null ||
      !sameSecret(state, options.state)
    )
      return answer(
        res,
        400,
        'walkerOS CLI: this is not the sign-in this terminal is waiting for.',
      );

    const fail = (message: string) => {
      outcome = 'failed';
      redirect(res, FAILED_PATH);
      rejectCode(new LoginError(message));
    };
    if (url.searchParams.has('error'))
      return fail(
        'the sign-in did not finish (it was not allowed, or the app could not complete it): run walkeros login again',
      );
    if (url.searchParams.get('iss') !== options.issuer)
      return fail(
        `the browser came back from another sign-in than ${options.issuer}, so no code was exchanged: run walkeros login again`,
      );
    const value = url.searchParams.get('code');
    if (value === null || !CODE_SHAPE.test(value))
      return fail(
        `the browser came back from ${options.issuer} without a code: run walkeros login again`,
      );
    outcome = 'held';
    held = res;
    resolveCode(value);
  });

  function redirect(res: ServerResponse, location: string): void {
    res.writeHead(303, { ...PAGE_HEADERS, Location: location });
    res.end();
    graceThenClose();
  }

  function graceThenClose(): void {
    clearTimeout(timer);
    // The done page is the browser's next request; nothing else waits for it.
    timer = setTimeout(close, DONE_GRACE_MS);
    timer.unref();
    server.unref();
  }

  function close(): void {
    clearTimeout(timer);
    server.closeAllConnections();
    server.close();
  }

  return new Promise((resolve, reject) => {
    // Only a failure to listen is reported; the promise settles once.
    server.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        new LoginError(
          error.code === 'EADDRINUSE'
            ? `port ${options.port} on 127.0.0.1 is in use: choose another with --port <n> or WALKEROS_LOGIN_PORT`
            : `cannot listen on port ${options.port} of 127.0.0.1 (${error.code ?? error.message}): choose another with --port <n> or WALKEROS_LOGIN_PORT`,
        ),
      );
    });
    server.listen({ port: options.port, host: '127.0.0.1' }, () => {
      const address = server.address();
      const port =
        address !== null && typeof address === 'object' ? address.port : 0;
      timer = setTimeout(() => {
        if (outcome !== 'waiting') return;
        outcome = 'failed';
        rejectCode(new LoginError(timeoutMessage(options.timeoutMs)));
        close();
      }, options.timeoutMs);
      resolve({
        port,
        redirectUri: `http://127.0.0.1:${port}/callback`,
        code,
        finish(signedIn: boolean) {
          if (held === null) {
            // Nothing to answer: close now, unless an answer already went
            // out and its page is still to come.
            if (outcome === 'waiting') close();
            return;
          }
          const res = held;
          held = null;
          outcome = signedIn ? 'done' : 'failed';
          redirect(res, signedIn ? DONE_PATH : FAILED_PATH);
        },
        close,
      });
    });
  });
}
