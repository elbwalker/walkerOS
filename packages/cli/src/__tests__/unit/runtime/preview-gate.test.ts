import http from 'http';
import { webcrypto } from 'node:crypto';
import type { ActivationGrant } from '@walkeros/core';
import {
  createHealthServer,
  type PreviewGateConfig,
} from '../../../runtime/health-server.js';
import { resolvePreviewGate } from '../../../commands/run/pipeline.js';
import { createMockLogger } from '../../helpers/mock-logger.js';

const mockLogger = createMockLogger();

// node's webcrypto is a structural PreviewCrypto: passes verifyActivation's
// injectable `crypto` slot without a cast (mirrors core's preview.test.ts).
const crypto = webcrypto;

const b64urlBytes = (bytes: ArrayBuffer | Uint8Array): string =>
  Buffer.from(
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  ).toString('base64url');

interface KeyPair {
  privateKey: webcrypto.CryptoKey;
  spki: string;
}

async function generateKeyPair(): Promise<KeyPair> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  return {
    privateKey: pair.privateKey,
    spki: b64urlBytes(await crypto.subtle.exportKey('spki', pair.publicKey)),
  };
}

async function signGrant(
  privateKey: webcrypto.CryptoKey,
  kid: string,
  grant: ActivationGrant,
): Promise<string> {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid })).toString(
    'base64url',
  );
  const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
  const signed = Buffer.from(`${header}.${payload}`); // no TextEncoder needed
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    signed,
  );
  return `${header}.${payload}.${b64urlBytes(sig)}`;
}

// A session-bound container grant. iat/sxp minted fresh so `source: 'storage'`
// verification (deadline = sxp) always sits inside the session with the gate's
// live Date.now() clock. `aud` is irrelevant on the container arm (no origin,
// no acceptForeign) but must be a string[] to parse.
function grantFor(ses: string, sb: string, pb = 'pb_this'): ActivationGrant {
  const iat = Math.floor(Date.now() / 1000);
  return {
    iss: 'app:stage',
    aud: ['https://shop.example.com'],
    iat,
    sxp: iat + 3600,
    art: 'art_preview',
    sri: 'sha384-AAAA',
    pb,
    cap: 'activate',
    jti: 'gr_test',
    pid: 'prv_test',
    ses,
    sb,
  };
}

let activeKey: KeyPair;
let retiredKey: KeyPair;

beforeAll(async () => {
  activeKey = await generateKeyPair();
  retiredKey = await generateKeyPair();
});

// A gate armed for session { ses_this, sb_this }, keyring holds the active key.
function armedGate(
  overrides: Partial<PreviewGateConfig> = {},
): PreviewGateConfig {
  return {
    keyring: [{ kid: 'pk_active', spki: activeKey.spki }],
    iss: 'app:stage',
    pb: 'pb_this',
    expectSession: { ses: 'ses_this', sb: 'sb_this' },
    crypto,
    ...overrides,
  };
}

interface HttpResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function httpRequest(
  port: number,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: options.path,
        method: options.method,
        headers: options.headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body }),
        );
      },
    );
    req.on('error', reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
}

const servers: Array<Awaited<ReturnType<typeof createHealthServer>>> = [];

// Start a server (optionally armed) with a flow handler that echoes the request
// body — an echo proves the gate did not consume the stream before delegating.
// Pass `flowHandler` to test the gate against a misbehaving flow.
async function startServer(
  gate?: PreviewGateConfig,
  flowHandler?: http.RequestListener,
): Promise<{ port: number }> {
  const server = await createHealthServer(0, mockLogger, gate);
  server.setFlowHandler(
    flowHandler ??
      ((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, echo: body }));
        });
      }),
  );
  server.setReady(true);
  servers.push(server);
  return { port: (server.server.address() as { port: number }).port };
}

afterEach(async () => {
  while (servers.length) {
    const server = servers.pop();
    if (server) await server.close();
  }
});

describe('preview intake gate', () => {
  it('is INERT for a production container (no preview env)', async () => {
    const { port } = await startServer(undefined);
    const res = await httpRequest(port, {
      method: 'POST',
      path: '/collect',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page view' }),
    });
    // production intake is byte-identical: no auth demanded
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  it('401s a POST with no grant when preview env is present', async () => {
    const { port } = await startServer(armedGate());
    const res = await httpRequest(port, {
      method: 'POST',
      path: '/collect',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'page view' }),
    });
    expect(res.status).toBe(401);
    // generic body: no reason detail leaks to the caller
    expect(res.body).not.toContain('grant');
    expect(res.body).not.toContain('sb-mismatch');
  });

  it('401s a non-POST (GET) with no grant on an armed gate', async () => {
    // The gate must guard EVERY delegated method, not just POST — a GET bypass
    // would reopen the hole.
    const { port } = await startServer(armedGate());
    const res = await httpRequest(port, { method: 'GET', path: '/collect' });
    expect(res.status).toBe(401);
  });

  it('accepts a grant bound to THIS session and passes the body through intact', async () => {
    const { port } = await startServer(armedGate());
    const grant = await signGrant(
      activeKey.privateKey,
      'pk_active',
      grantFor('ses_this', 'sb_this'),
    );
    const payload = JSON.stringify({ event: 'page view' });
    const res = await httpRequest(port, {
      method: 'POST',
      path: '/collect',
      headers: {
        'Content-Type': 'application/json',
        'X-Walkeros-Preview': grant,
      },
      body: payload,
    });
    expect(res.status).toBe(200);
    // Body survived the gate: the flow handler echoed exactly what was sent.
    expect(JSON.parse(res.body)).toEqual({ ok: true, echo: payload });
  });

  it('answers 500 (not the gate 401) when the flow handler throws after a valid grant', async () => {
    // A downstream handler failure is the flow's own error, not a verification
    // failure: answering 401 would misreport an authenticated request as
    // unauthorized and mislabel the log.
    const { port } = await startServer(armedGate(), () => {
      throw new Error('flow handler exploded');
    });
    const grant = await signGrant(
      activeKey.privateKey,
      'pk_active',
      grantFor('ses_this', 'sb_this'),
    );
    const res = await httpRequest(port, {
      method: 'POST',
      path: '/collect',
      headers: {
        'Content-Type': 'application/json',
        'X-Walkeros-Preview': grant,
      },
      body: JSON.stringify({ event: 'page view' }),
    });
    expect(res.status).toBe(500);
    expect(res.body).not.toContain('Unauthorized');
  });

  it('REJECTS a validly-signed grant minted for a DIFFERENT session (sb binding)', async () => {
    // Same key signs the whole environment, so a valid signature proves nothing
    // about which session minted the grant. ses/sb is what binds it.
    const { port } = await startServer(armedGate());
    const grant = await signGrant(
      activeKey.privateKey,
      'pk_active',
      grantFor('ses_other', 'sb_other'),
    );
    const res = await httpRequest(port, {
      method: 'POST',
      path: '/collect',
      headers: {
        'Content-Type': 'application/json',
        'X-Walkeros-Preview': grant,
      },
      body: JSON.stringify({ event: 'page view' }),
    });
    expect(res.status).toBe(401);
  });

  it('answers the CORS preflight WITHOUT demanding the grant header', async () => {
    const { port } = await startServer(armedGate());
    const res = await httpRequest(port, {
      method: 'OPTIONS',
      path: '/collect',
      headers: {
        Origin: 'https://shop.example.com',
        'Access-Control-Request-Headers': 'content-type,x-walkeros-preview',
      },
    });
    expect(res.status).toBe(204);
    const allowHeaders = res.headers['access-control-allow-headers'];
    expect(typeof allowHeaders).toBe('string');
    expect(String(allowHeaders).toLowerCase()).toContain('x-walkeros-preview');
    expect(String(allowHeaders).toLowerCase()).toContain('content-type');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('reflects EVERY requested preflight header, not a static allowlist', async () => {
    // Regression: the api destination stamps a `traceparent` header for trace
    // stitching. A pinned allow-headers list blocked the browser's preflight
    // for exactly that header, so every browser-forwarded event to the session
    // container was dropped while the ungated production path (whose cors
    // middleware reflects) kept working. The gate must reflect like production.
    const { port } = await startServer(armedGate());
    const res = await httpRequest(port, {
      method: 'OPTIONS',
      path: '/collect',
      headers: {
        Origin: 'https://shop.example.com',
        'Access-Control-Request-Headers':
          'content-type,traceparent,x-walkeros-preview',
      },
    });
    expect(res.status).toBe(204);
    const allowHeaders = String(
      res.headers['access-control-allow-headers'],
    ).toLowerCase();
    expect(allowHeaders).toContain('traceparent');
    expect(allowHeaders).toContain('x-walkeros-preview');
    expect(allowHeaders).toContain('content-type');
    expect(res.headers['vary']).toContain('Access-Control-Request-Headers');
  });

  it('falls back to the grant-header allowlist when the preflight names none', async () => {
    const { port } = await startServer(armedGate());
    const res = await httpRequest(port, {
      method: 'OPTIONS',
      path: '/collect',
      headers: { Origin: 'https://shop.example.com' },
    });
    expect(res.status).toBe(204);
    const allowHeaders = String(
      res.headers['access-control-allow-headers'],
    ).toLowerCase();
    expect(allowHeaders).toContain('x-walkeros-preview');
    expect(allowHeaders).toContain('content-type');
  });

  it('accepts a grant signed by a RETIRED key still in the keyring (rotation safety)', async () => {
    // Booting with only the active key would break every live session whose web
    // deployment still mints against a retired kid.
    const { port } = await startServer(
      armedGate({
        keyring: [
          { kid: 'pk_retired', spki: retiredKey.spki },
          { kid: 'pk_active', spki: activeKey.spki },
        ],
      }),
    );
    const grant = await signGrant(
      retiredKey.privateKey,
      'pk_retired',
      grantFor('ses_this', 'sb_this'),
    );
    const res = await httpRequest(port, {
      method: 'POST',
      path: '/collect',
      headers: {
        'Content-Type': 'application/json',
        'X-Walkeros-Preview': grant,
      },
      body: JSON.stringify({ event: 'page view' }),
    });
    expect(res.status).toBe(200);
  });

  it('leaves the runner health routes outside the gate when armed', async () => {
    const { port } = await startServer(armedGate());
    const health = await httpRequest(port, { method: 'GET', path: '/health' });
    expect(health.status).toBe(200);
    const ready = await httpRequest(port, { method: 'GET', path: '/ready' });
    expect(ready.status).toBe(200);
  });
});

describe('resolvePreviewGate (boot-time env resolution)', () => {
  const fullEnv = (): NodeJS.ProcessEnv => ({
    WALKEROS_PREVIEW_KEYRING: JSON.stringify([
      { kid: 'pk_active', spki: 'c3BraQ' },
    ]),
    WALKEROS_PREVIEW_SES: 'ses_this',
    WALKEROS_PREVIEW_SB: 'sb_this',
    WALKEROS_PREVIEW_ISS: 'app:stage',
    WALKEROS_PREVIEW_PB: 'pb_this',
  });

  it('returns undefined (inert) when NO preview env is present', () => {
    expect(resolvePreviewGate({})).toBeUndefined();
  });

  it('resolves a full gate config when all five vars are present', () => {
    const gate = resolvePreviewGate(fullEnv());
    expect(gate).toBeDefined();
    expect(gate?.iss).toBe('app:stage');
    expect(gate?.pb).toBe('pb_this');
    expect(gate?.expectSession).toEqual({ ses: 'ses_this', sb: 'sb_this' });
    expect(gate?.keyring).toEqual([{ kid: 'pk_active', spki: 'c3BraQ' }]);
  });

  it('throws naming the missing vars on a PARTIAL set (app stamping bug)', () => {
    const env = fullEnv();
    delete env.WALKEROS_PREVIEW_ISS;
    delete env.WALKEROS_PREVIEW_PB;
    expect(() => resolvePreviewGate(env)).toThrow('WALKEROS_PREVIEW_ISS');
    expect(() => resolvePreviewGate(env)).toThrow('WALKEROS_PREVIEW_PB');
  });

  it('throws on malformed keyring JSON (fail closed, never inert)', () => {
    const env = fullEnv();
    env.WALKEROS_PREVIEW_KEYRING = '{not json';
    expect(() => resolvePreviewGate(env)).toThrow('WALKEROS_PREVIEW_KEYRING');
  });

  it('throws when the keyring is well-formed JSON but the wrong shape', () => {
    const env = fullEnv();
    env.WALKEROS_PREVIEW_KEYRING = JSON.stringify([{ kid: 'pk_active' }]);
    expect(() => resolvePreviewGate(env)).toThrow('WALKEROS_PREVIEW_KEYRING');
  });

  it('treats an empty-string var as absent (partial → throw)', () => {
    const env = fullEnv();
    env.WALKEROS_PREVIEW_SB = '';
    expect(() => resolvePreviewGate(env)).toThrow('WALKEROS_PREVIEW_SB');
  });
});
