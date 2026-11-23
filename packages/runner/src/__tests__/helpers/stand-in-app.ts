import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'http';
import type { AddressInfo } from 'net';
import type { ServiceCredential } from '@walkeros/core';
import {
  APP_SIGNATURE_TAG,
  verifyRequestSignature,
} from '@walkeros/server-core';
import {
  archiveUrl,
  checkInUrl,
  releaseSecretsUrl,
  releaseUrl,
} from '../../api-paths.js';
import { CLOSED_ISSUER, testCredential } from './credential.js';
import {
  FIXTURE_DEPLOYMENT,
  type ReleaseFixture,
  type WebReleaseFixture,
} from './release-fixture.js';
import { sealSecretSet } from './seal.js';

/**
 * The four runner routes, by the operation each serves, and the two ways a
 * served web part reaches them: `served-release` is the release route with
 * `?deployment=<web deployment>`, `served-file` the archive route of a web
 * release's version id.
 */
export type StandInRoute =
  | 'check-in'
  | 'release'
  | 'archive'
  | 'secrets'
  | 'served-release'
  | 'served-file';

export interface StandInRequest {
  method: string;
  path: string;
  /** The route it reached; `storage` is the archive's redirect target. */
  route?: StandInRoute | 'storage';
  /** For `served-release` and `served-file`: the web deployment asked for. */
  deployment?: string;
  headers: IncomingHttpHeaders;
  body: Uint8Array;
}

export interface StandInAnswer {
  status: number;
  /** Sent as the `Retry-After` header, as written. */
  retryAfter?: string;
  /** More answer headers, as written: a `WWW-Authenticate` challenge, a `Date`. */
  headers?: Record<string, string>;
}

export interface StandInApp {
  /** `http://127.0.0.1:<port>`, the same across stop and start. */
  readonly origin: string;
  readonly port: number;
  /** Every request in the order it came, its body read in full. */
  readonly requests: StandInRequest[];
  /**
   * Serve a release's archive and walkerOS secrets by its version id;
   * `current` also makes its document the one the release route answers.
   */
  serve(release: ReleaseFixture, options?: { current?: boolean }): void;
  /**
   * Serve a web release's file by its version id; `current` also makes its
   * document the one the release route answers for its deployment.
   */
  serveWeb(release: WebReleaseFixture, options?: { current?: boolean }): void;
  /** A web deployment's current document by sequence; null answers 404 and leaves it out of the check-in's `served`. */
  setWebCurrent(deployment: string, sequence: number | null): void;
  /**
   * The credential the app holds for its runner, a new pairing when it
   * changes: its public signing key checks each request's signature, its
   * public encryption key seals each secret set.
   */
  setCredential(credential: ServiceCredential): void;
  /**
   * Pairs a runner: a deployment's credential with fresh keys, its resource
   * this origin's `/api` and its issuer a closed port (so its client buys no
   * token and signs), held from now on.
   */
  pair(): Promise<{ credential: ServiceCredential; raw: string }>;
  /** Serve these bytes as a release's secret set instead of sealing its values; undefined goes back to sealing. */
  setSecretSet(sequence: number, bytes: Uint8Array | undefined): void;
  /** The release route's document by sequence; null answers 404. */
  setCurrent(sequence: number | null): void;
  /**
   * The check-in answer: by default `{ release: <current sequence or null>,
   * served: { <web deployment>: <its current sequence>, ... } }`, `served`
   * `{}` when no web deployment has a current release; a string is sent as
   * written; undefined goes back to the default.
   */
  setCheckInAnswer(answer: unknown): void;
  /**
   * Answer this on a route, or on the archive's storage hop, whatever the
   * request carries, until it is set back to undefined.
   */
  setAnswer(
    route: StandInRoute | 'storage',
    answer: StandInAnswer | undefined,
  ): void;
  /** Serve each archive and web file behind one 302 to a storage path of this origin. */
  redirectArchives(on: boolean): void;
  /**
   * Holds the answer to every request on this route, from now on, until the
   * function it returns is called: a slow app or storage, as a test meets it.
   */
  hold(route: StandInRoute | 'storage'): () => void;
  stop(): Promise<void>;
  /** Listen again on the same port. */
  start(): Promise<void>;
}

const HOST = '127.0.0.1';
/**
 * The app's challenge to a request with no credential or a signature it
 * refuses (RFC 9449 section 7.1): it names no error.
 */
const CHALLENGE = 'DPoP algs="ES256"';

function pathOf(url: string): string {
  return new URL(url).pathname;
}

/** A request's body, read in full. */
export async function bodyOf(request: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks));
}

function etagOf(release: { documentSha256: string }): string {
  return `"${release.documentSha256}"`;
}

function matchesEtag(header: string | undefined, etag: string): boolean {
  if (header === undefined) return false;
  return header
    .split(',')
    .map((tag) => tag.trim())
    .some((tag) => tag === etag || tag === '*');
}

/** A Node request's headers as fetch's `Headers`, repeated headers kept. */
export function headersOf(incoming: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming)) {
    if (typeof value === 'string') headers.set(name, value);
    else if (Array.isArray(value))
      for (const item of value) headers.append(name, item);
  }
  return headers;
}

/**
 * A local stand-in of the app's four runner routes on port 0, for tests of
 * `runneros remote`, with the web parts a server release serves: the
 * release route answers a web deployment's current document for
 * `?deployment=<id>`, the archive route its file by its version id. Its
 * paths come from `api-paths.ts`, never retyped. As
 * the app does, a route answers 401 with the challenge `DPoP algs="ES256"`
 * to a request whose RFC 9421 signature (tag `walkeros-app`, the held
 * credential's public signing key) does not verify, and seals a release's
 * walkerOS secrets to the held credential at each read; the storage hop
 * takes no credential. It takes no DPoP token: a forced answer
 * (`setAnswer`) is the one way a test meets a token's refusal.
 */
export async function startStandInApp(
  options: { credential?: ServiceCredential } = {},
): Promise<StandInApp> {
  const requests: StandInRequest[] = [];
  const releases = new Map<number, ReleaseFixture>();
  const webReleases: WebReleaseFixture[] = [];
  const webCurrent = new Map<string, number>();
  const answers = new Map<StandInRoute | 'storage', StandInAnswer>();
  const secretSets = new Map<number, Uint8Array>();
  const holds = new Map<StandInRoute | 'storage', Promise<void>>();
  const releaseHolds = new Set<() => void>();
  let credential = options.credential;
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

  const webByVersion = (path: string): WebReleaseFixture | undefined =>
    webReleases.find(
      (release) =>
        pathOf(archiveUrl(origin, release.document.release)) === path,
    );

  const webCurrentOf = (deployment: string): WebReleaseFixture | undefined => {
    const sequence = webCurrent.get(deployment);
    return webReleases.find(
      (release) =>
        release.document.deployment === deployment &&
        release.document.sequence === sequence,
    );
  };

  const routeOf = (
    method: string,
    url: URL,
  ): Pick<StandInRequest, 'route' | 'deployment'> => {
    const path = url.pathname;
    if (method === 'POST' && path === pathOf(checkInUrl(origin)))
      return { route: 'check-in' };
    if (method !== 'GET') return {};
    if (path === pathOf(releaseUrl(origin))) {
      const deployment = url.searchParams.get('deployment');
      return deployment === null
        ? { route: 'release' }
        : { route: 'served-release', deployment };
    }
    if (byVersion(path, archiveUrl)) return { route: 'archive' };
    const web = webByVersion(path);
    if (web)
      return { route: 'served-file', deployment: web.document.deployment };
    if (byVersion(path, releaseSecretsUrl)) return { route: 'secrets' };
    if (path.startsWith('/storage/')) return { route: 'storage' };
    return {};
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

  /** The held credential, when the request carries its signature over the URL it was sent to. */
  const signer = async (
    req: IncomingMessage,
    method: string,
    body: Uint8Array,
  ): Promise<ServiceCredential | undefined> => {
    const held = credential;
    if (!held) return undefined;
    const { kty, crv, x, y } = held.sig;
    const verified = await verifyRequestSignature({
      method,
      url: `${origin}${req.url ?? '/'}`,
      headers: headersOf(req.headers),
      body,
      key: { kty, crv, x, y },
      tag: APP_SIGNATURE_TAG,
    });
    return verified.ok ? held : undefined;
  };

  const handle = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    const method = req.method ?? '';
    const url = new URL(req.url ?? '/', origin);
    const path = url.pathname;
    const reached = routeOf(method, url);
    const { route } = reached;
    const body = await bodyOf(req);
    requests.push({ method, path, ...reached, headers: req.headers, body });
    if (route === undefined) return send(res, 404);
    await holds.get(route);

    const answer = answers.get(route);
    if (answer)
      return send(res, answer.status, undefined, {
        ...answer.headers,
        ...(answer.retryAfter !== undefined && {
          'retry-after': answer.retryAfter,
        }),
      });

    if (route === 'storage') {
      const name = path.slice('/storage/'.length);
      const release = [...releases.values()].find(
        (candidate) => `${candidate.artifact.sha256}.tgz` === name,
      );
      if (release)
        return send(res, 200, release.archive, {
          'content-type': 'application/gzip',
        });
      const web = webReleases.find(
        (candidate) => `${candidate.artifact.sha256}.js` === name,
      );
      return web
        ? send(res, 200, web.file, { 'content-type': 'text/javascript' })
        : send(res, 404);
    }

    const held = await signer(req, method, body);
    if (!held)
      return send(res, 401, undefined, { 'www-authenticate': CHALLENGE });

    switch (route) {
      case 'check-in': {
        const answerBody =
          checkInAnswer === undefined
            ? JSON.stringify({
                release: current,
                served: Object.fromEntries(webCurrent),
              })
            : typeof checkInAnswer === 'string'
              ? checkInAnswer
              : JSON.stringify(checkInAnswer);
        return send(res, 200, answerBody, {
          'content-type': 'application/json',
        });
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
      case 'served-release': {
        const release = webCurrentOf(reached.deployment ?? '');
        if (!release) return send(res, 404);
        const etag = etagOf(release);
        if (matchesEtag(req.headers['if-none-match'], etag))
          return send(res, 304, undefined, { etag });
        return send(res, 200, release.documentBytes, {
          'content-type': 'application/json',
          etag,
        });
      }
      case 'served-file': {
        const release = webByVersion(path);
        if (!release) return send(res, 404);
        if (redirect)
          return send(res, 302, undefined, {
            location: `${origin}/storage/${release.artifact.sha256}.js`,
          });
        return send(res, 200, release.file, {
          'content-type': 'text/javascript',
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
        const { deployment, sequence } = release.document;
        // Sealed at each read, as the app seals: a new pairing's key opens it.
        const sealed =
          secretSets.get(sequence) ??
          (await sealSecretSet({
            key: held.enc,
            deployment,
            sequence,
            values: release.values,
          }));
        return send(res, 200, sealed, { 'content-type': 'application/jose' });
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
    serveWeb(release, serveOptions = {}) {
      const { deployment, sequence } = release.document;
      const index = webReleases.findIndex(
        (held) =>
          held.document.deployment === deployment &&
          held.document.sequence === sequence,
      );
      if (index >= 0) webReleases.splice(index, 1, release);
      else webReleases.push(release);
      if (serveOptions.current) webCurrent.set(deployment, sequence);
    },
    setWebCurrent(deployment, sequence) {
      if (sequence === null) webCurrent.delete(deployment);
      else webCurrent.set(deployment, sequence);
    },
    setCredential(next) {
      credential = next;
    },
    async pair() {
      const paired = await testCredential('deployment', {
        resource: `${origin}/api`,
        iss: CLOSED_ISSUER,
        id: FIXTURE_DEPLOYMENT,
      });
      credential = paired.credential;
      return paired;
    },
    setSecretSet(sequence, bytes) {
      if (bytes) secretSets.set(sequence, bytes);
      else secretSets.delete(sequence);
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
    hold(route) {
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = () => {
          releaseHolds.delete(release);
          if (holds.get(route) === held) holds.delete(route);
          resolve();
        };
      });
      holds.set(route, held);
      releaseHolds.add(release);
      return release;
    },
    stop() {
      // A held answer goes out now, to a connection about to close.
      for (const release of [...releaseHolds]) release();
      return new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    },
    start: listen,
  };
}
