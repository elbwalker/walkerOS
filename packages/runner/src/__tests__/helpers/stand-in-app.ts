import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'http';
import type { AddressInfo } from 'net';
import {
  archiveUrl,
  checkInUrl,
  releaseSecretsUrl,
  releaseUrl,
} from '../../api-paths.js';
import type { ReleaseFixture } from './release-fixture.js';

/** The four runner routes, by the operation each serves. */
export type StandInRoute = 'check-in' | 'release' | 'archive' | 'secrets';

export interface StandInRequest {
  method: string;
  path: string;
  /** The route it reached; `storage` is the archive's redirect target. */
  route?: StandInRoute | 'storage';
  headers: IncomingHttpHeaders;
  body: Uint8Array;
}

export interface StandInAnswer {
  status: number;
  /** Sent as the `Retry-After` header, as written. */
  retryAfter?: string;
}

export interface StandInApp {
  /** `http://127.0.0.1:<port>`, the same across stop and start. */
  readonly origin: string;
  readonly port: number;
  /** Every request in the order it came, its body read in full. */
  readonly requests: StandInRequest[];
  /**
   * Serve a release's archive and secret set by its version id; `current`
   * also makes its document the one the release route answers.
   */
  serve(release: ReleaseFixture, options?: { current?: boolean }): void;
  /** The release route's document by sequence; null answers 404. */
  setCurrent(sequence: number | null): void;
  /**
   * The check-in answer: by default `{ release: <current sequence or null> }`;
   * a string is sent as written; undefined goes back to the default.
   */
  setCheckInAnswer(answer: unknown): void;
  /** Answer this status on a route, or on the archive's storage hop, until it is set back to undefined. */
  setAnswer(
    route: StandInRoute | 'storage',
    answer: StandInAnswer | undefined,
  ): void;
  /** Serve each archive behind one 302 to a storage path of this origin. */
  redirectArchives(on: boolean): void;
  stop(): Promise<void>;
  /** Listen again on the same port. */
  start(): Promise<void>;
}

const HOST = '127.0.0.1';

function pathOf(url: string): string {
  return new URL(url).pathname;
}

async function bodyOf(request: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks));
}

function etagOf(release: ReleaseFixture): string {
  return `"${release.documentSha256}"`;
}

function matchesEtag(header: string | undefined, etag: string): boolean {
  if (header === undefined) return false;
  return header
    .split(',')
    .map((tag) => tag.trim())
    .some((tag) => tag === etag || tag === '*');
}

/**
 * A local stand-in of the app's four runner routes on port 0, for tests of
 * `runneros remote`. Its paths come from `api-paths.ts`, never retyped. With
 * `token`, a route answers 401 to a request without `Bearer <token>`; the
 * storage hop takes none.
 */
export async function startStandInApp(
  options: { token?: string } = {},
): Promise<StandInApp> {
  const requests: StandInRequest[] = [];
  const releases = new Map<number, ReleaseFixture>();
  const answers = new Map<StandInRoute | 'storage', StandInAnswer>();
  let current: number | null = null;
  let checkInAnswer: unknown;
  let redirect = false;
  let port = 0;
  let origin = '';

  const byVersion = (
    path: string,
    url: (origin: string, versionId: string) => string,
  ): ReleaseFixture | undefined => {
    for (const release of releases.values())
      if (pathOf(url(origin, release.document.release)) === path)
        return release;
    return undefined;
  };

  const routeOf = (
    method: string,
    path: string,
  ): StandInRequest['route'] | undefined => {
    if (method === 'POST' && path === pathOf(checkInUrl(origin)))
      return 'check-in';
    if (method !== 'GET') return undefined;
    if (path === pathOf(releaseUrl(origin))) return 'release';
    if (byVersion(path, archiveUrl)) return 'archive';
    if (byVersion(path, releaseSecretsUrl)) return 'secrets';
    if (path.startsWith('/storage/')) return 'storage';
    return undefined;
  };

  const send = (
    res: ServerResponse,
    status: number,
    body?: Uint8Array | string,
    headers: Record<string, string> = {},
  ): void => {
    res.writeHead(status, headers);
    res.end(body);
  };

  const handle = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    const method = req.method ?? '';
    const path = new URL(req.url ?? '/', origin).pathname;
    const route = routeOf(method, path);
    requests.push({
      method,
      path,
      ...(route ? { route } : {}),
      headers: req.headers,
      body: await bodyOf(req),
    });
    if (route === undefined) return send(res, 404);

    if (route === 'storage') {
      const stored = answers.get('storage');
      if (stored) return send(res, stored.status);
      const sha256 = path.slice('/storage/'.length, -'.tgz'.length);
      const release = [...releases.values()].find(
        (candidate) => candidate.artifact.sha256 === sha256,
      );
      return release
        ? send(res, 200, release.archive, {
            'content-type': 'application/gzip',
          })
        : send(res, 404);
    }

    if (
      options.token !== undefined &&
      req.headers.authorization !== `Bearer ${options.token}`
    )
      return send(res, 401);
    const answer = answers.get(route);
    if (answer)
      return send(
        res,
        answer.status,
        undefined,
        answer.retryAfter === undefined
          ? {}
          : { 'retry-after': answer.retryAfter },
      );

    switch (route) {
      case 'check-in': {
        const body =
          checkInAnswer === undefined
            ? JSON.stringify({ release: current })
            : typeof checkInAnswer === 'string'
              ? checkInAnswer
              : JSON.stringify(checkInAnswer);
        return send(res, 200, body, { 'content-type': 'application/json' });
      }
      case 'release': {
        const release = current === null ? undefined : releases.get(current);
        if (!release) return send(res, 404);
        const etag = etagOf(release);
        if (matchesEtag(req.headers['if-none-match'], etag))
          return send(res, 304, undefined, { etag });
        return send(res, 200, release.documentBytes, {
          'content-type': 'application/json',
          etag,
        });
      }
      case 'archive': {
        const release = byVersion(path, archiveUrl);
        if (!release) return send(res, 404);
        if (redirect)
          return send(res, 302, undefined, {
            location: `${origin}/storage/${release.artifact.sha256}.tgz`,
          });
        return send(res, 200, release.archive, {
          'content-type': 'application/gzip',
        });
      }
      case 'secrets': {
        const release = byVersion(path, releaseSecretsUrl);
        if (!release) return send(res, 404);
        return send(res, 200, release.secretSet, {
          'content-type': 'application/json',
        });
      }
    }
  };

  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) send(res, 500);
      else res.destroy();
    });
  });

  const listen = (): Promise<void> =>
    new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, HOST, () => {
        server.off('error', reject);
        const address: AddressInfo | string | null = server.address();
        if (address !== null && typeof address === 'object')
          port = address.port;
        origin = `http://${HOST}:${port}`;
        resolve();
      });
    });

  await listen();

  return {
    get origin() {
      return origin;
    },
    get port() {
      return port;
    },
    requests,
    serve(release, serveOptions = {}) {
      releases.set(release.document.sequence, release);
      if (serveOptions.current) current = release.document.sequence;
    },
    setCurrent(sequence) {
      current = sequence;
    },
    setCheckInAnswer(answer) {
      checkInAnswer = answer;
    },
    setAnswer(route, answer) {
      if (answer) answers.set(route, answer);
      else answers.delete(route);
    },
    redirectArchives(on) {
      redirect = on;
    },
    stop() {
      return new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    },
    start: listen,
  };
}
