import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'http';
import { createHash, randomBytes } from 'crypto';

/**
 * A stand-in for the walkerOS app and its authorization server on 127.0.0.1,
 * two origins over real HTTP. The app serves its protected resource document
 * (RFC 9728) and `/api/auth/whoami`. The authorization server, on another
 * port, serves its two discovery documents, the authorization endpoint (it
 * allows at once and redirects with `code`, `state` and `iss`), the token
 * endpoint (codes work once and need the PKCE verifier; refresh tokens
 * rotate) and the revocation endpoint. Each handler can be replaced by a test.
 */

export interface SeenRequest {
  /** The origin the request reached: `appUrl` or `issuer`. */
  origin: string;
  method: string;
  path: string;
  form: Record<string, string>;
  authorization: string | null;
}

export interface Answer {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Drop the connection instead of answering. */
  drop?: boolean;
}

type Handler = (
  form: Record<string, string>,
  req?: IncomingMessage,
) => Answer | Promise<Answer>;

export interface FakeApp {
  /** The app: its protected resource document and its API. */
  appUrl: string;
  /** The authorization server, on an origin of its own. */
  issuer: string;
  requests: SeenRequest[];
  resourceDocument: Record<string, unknown>;
  metadata: Record<string, unknown>;
  clientDocument: Record<string, unknown>;
  token: Handler;
  revoke: Handler;
  /** Answers `GET /api/auth/whoami`; by default 200 for any live access token. */
  whoami: (authorization: string | null) => Answer;
  /** Every access token the token endpoint handed out and did not revoke. */
  liveAccess: Set<string>;
  count(method: string, path: string): number;
  close(): Promise<void>;
}

const hex = (bytes: number) => randomBytes(bytes).toString('hex');

function send(res: ServerResponse, answer: Answer): void {
  if (answer.drop) {
    res.socket?.destroy();
    return;
  }
  res.writeHead(answer.status, {
    'Content-Type': 'application/json',
    ...answer.headers,
  });
  res.end(answer.body === undefined ? '' : JSON.stringify(answer.body));
}

async function readForm(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Object.fromEntries(
    new URLSearchParams(Buffer.concat(chunks).toString('utf-8')),
  );
}

export async function startFakeApp(): Promise<FakeApp> {
  const codes = new Map<
    string,
    { challenge: string; redirectUri: string; used: boolean }
  >();
  const refreshTokens = new Set<string>();
  let serial = 0;

  async function seen(
    req: IncomingMessage,
    origin: string,
  ): Promise<{ url: URL; form: Record<string, string> }> {
    const url = new URL(req.url ?? '/', origin);
    const form = req.method === 'POST' ? await readForm(req) : {};
    app.requests.push({
      origin,
      method: req.method ?? 'GET',
      path: url.pathname,
      form,
      authorization: req.headers.authorization ?? null,
    });
    return { url, form };
  }

  const appServer = createServer(async (req, res) => {
    const { url } = await seen(req, app.appUrl);
    if (
      req.method === 'GET' &&
      url.pathname === '/.well-known/oauth-protected-resource/api'
    )
      return send(res, { status: 200, body: app.resourceDocument });
    if (req.method === 'GET' && url.pathname === '/api/auth/whoami')
      return send(res, app.whoami(req.headers.authorization ?? null));
    send(res, { status: 404, body: { error: 'not_found' } });
  });

  const authServer = createServer(async (req, res) => {
    const { url, form } = await seen(req, app.issuer);
    if (
      req.method === 'GET' &&
      url.pathname === '/.well-known/oauth-authorization-server'
    )
      return send(res, { status: 200, body: app.metadata });
    if (req.method === 'GET' && url.pathname === '/oauth/walkeros-cli')
      return send(res, { status: 200, body: app.clientDocument });
    if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
      const code = hex(32);
      const redirectUri = url.searchParams.get('redirect_uri') ?? '';
      codes.set(code, {
        challenge: url.searchParams.get('code_challenge') ?? '',
        redirectUri,
        used: false,
      });
      const back = new URL(redirectUri);
      back.searchParams.set('code', code);
      back.searchParams.set('state', url.searchParams.get('state') ?? '');
      back.searchParams.set('iss', app.issuer);
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (
      req.method === 'POST' &&
      (url.pathname === '/api/oauth/token' || url.pathname === '/custom/token')
    )
      return send(res, await app.token(form, req));
    if (
      req.method === 'POST' &&
      (url.pathname === '/api/oauth/revoke' ||
        url.pathname === '/custom/revoke')
    )
      return send(res, await app.revoke(form, req));
    send(res, { status: 404, body: { error: 'not_found' } });
  });

  const listen = async (server: Server): Promise<string> => {
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    const port =
      address !== null && typeof address === 'object' ? address.port : 0;
    return `http://127.0.0.1:${port}`;
  };
  const appUrl = await listen(appServer);
  const issuer = await listen(authServer);

  const pair = () => {
    serial += 1;
    const access = `wos_at_${serial}_${hex(8)}`;
    const refresh = `wos_rt_${serial}_${hex(8)}`;
    app.liveAccess.add(access);
    refreshTokens.add(refresh);
    return {
      access_token: access,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refresh,
      scope: 'read write offline_access',
    };
  };

  const app: FakeApp = {
    appUrl,
    issuer,
    requests: [],
    liveAccess: new Set(),
    resourceDocument: {
      resource: `${appUrl}/api`,
      authorization_servers: [issuer],
      scopes_supported: ['read', 'write'],
      bearer_methods_supported: ['header'],
    },
    metadata: {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      revocation_endpoint: `${issuer}/api/oauth/revoke`,
      code_challenge_methods_supported: ['S256'],
      authorization_response_iss_parameter_supported: true,
    },
    clientDocument: {
      client_id: `${issuer}/oauth/walkeros-cli`,
      client_name: 'walkerOS CLI',
      redirect_uris: ['http://127.0.0.1/callback', `${issuer}/oauth/cli-code`],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'read write offline_access',
    },
    token(form) {
      if (form.client_id !== `${issuer}/oauth/walkeros-cli`)
        return { status: 401, body: { error: 'invalid_client' } };
      if (form.grant_type === 'authorization_code') {
        const issued = codes.get(form.code ?? '');
        const verified =
          issued !== undefined &&
          !issued.used &&
          issued.redirectUri === form.redirect_uri &&
          createHash('sha256')
            .update(form.code_verifier ?? '')
            .digest('base64url') === issued.challenge;
        if (issued) issued.used = true;
        return verified
          ? { status: 200, body: pair() }
          : { status: 400, body: { error: 'invalid_grant' } };
      }
      if (form.grant_type === 'refresh_token') {
        if (!refreshTokens.delete(form.refresh_token ?? ''))
          return { status: 400, body: { error: 'invalid_grant' } };
        return { status: 200, body: pair() };
      }
      return { status: 400, body: { error: 'unsupported_grant_type' } };
    },
    revoke(form) {
      refreshTokens.delete(form.token ?? '');
      app.liveAccess.delete(form.token ?? '');
      return { status: 200 };
    },
    whoami(authorization) {
      const token = authorization?.replace(/^Bearer /, '') ?? '';
      return app.liveAccess.has(token)
        ? { status: 200, body: { userId: 'usr_1', email: 'a5@example.test' } }
        : { status: 401, body: { error: { message: 'Token expired' } } };
    },
    count(method, path) {
      return app.requests.filter((r) => r.method === method && r.path === path)
        .length;
    },
    async close() {
      for (const server of [appServer, authServer]) {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  };
  return app;
}

/**
 * Play the browser: open the sign-in address, follow the app's redirect to
 * the return address, and hand back what came back there, without opening
 * that return address (so a test decides what reaches the listener).
 */
export async function allowAt(url: string): Promise<URL> {
  const response = await fetch(url, { redirect: 'manual' });
  const location = response.headers.get('location');
  if (location === null) throw new Error(`no redirect from ${url}`);
  return new URL(location);
}
