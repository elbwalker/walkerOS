import type { PublicEcJwk, ServiceTargetKind } from '@walkeros/core';
import { ChannelError } from '../../channel';
import {
  appAnswerOf,
  createServiceAuth,
  sendWithServiceAuth,
} from '../../service-auth/client';
import { verifyRequestSignature } from '../../service-auth/signature';
import { decodeJws } from './jws-vectors';
import { TEST_KEY_ECC_P256, testCredential } from './rfc9421-vectors';

const METADATA_URL =
  'https://auth.walkeros.io/.well-known/oauth-authorization-server';
const TOKEN_URL = 'https://auth.walkeros.io/api/services/token';
const CHECK_IN = 'https://app.walkeros.io/api/runner/check-in';
const T0 = 1_800_000_000_000;
const HOUR = 3_600_000;
const REFUSED_RUNNER_LINE =
  "The app refused this runner's credential (replaced, revoked or ended); a self-hosted runner is paired again on its Self-hosted tab (HTTP 401)";

const { kty, crv, x, y } = TEST_KEY_ECC_P256;
const publicKey: PublicEcJwk = { kty, crv, x, y };
const get = { method: 'GET', url: CHECK_IN };
const bytes = (text: string) => new Uint8Array(Buffer.from(text, 'utf8'));

/** A stub app answering `send` from a list, recording the headers of each request. */
function app(...answers: Response[]) {
  const sent: Array<Record<string, string>> = [];
  return {
    sent,
    async send(headers: Record<string, string>): Promise<Response> {
      sent.push(headers);
      const answer = answers.shift();
      if (!answer) throw new Error('The stub app has no answer left');
      return answer;
    },
  };
}

const appAnswer = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, { status, headers });

/** How the stub token endpoint answers one request. */
type TokenAnswer = 'token' | 'refused' | 'down' | 'nonce' | 'hang';

interface TokenRequest {
  dpop: string | null;
  form: Record<string, string>;
}

/** A stub auth server (metadata and token endpoint) and a client of it on a clock the test moves. */
function stub(
  kind: ServiceTargetKind = 'deployment',
  answers: TokenAnswer[] = [],
) {
  let clock = T0;
  let issued = 0;
  const lines: string[] = [];
  const tokenRequests: TokenRequest[] = [];
  const queue = [...answers];

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === METADATA_URL)
      return Response.json({
        issuer: 'https://auth.walkeros.io',
        service_token_endpoint: TOKEN_URL,
        dpop_signing_alg_values_supported: ['ES256'],
      });
    if (url !== TOKEN_URL) return new Response(null, { status: 404 });
    const dpop = new Headers(init?.headers).get('dpop');
    tokenRequests.push({
      dpop,
      form: Object.fromEntries(new URLSearchParams(String(init?.body))),
    });
    switch (queue.shift() || 'token') {
      case 'token':
        issued += 1;
        return Response.json({
          access_token: `tok-${issued}`,
          token_type: dpop === null ? 'Bearer' : 'DPoP',
          expires_in: dpop === null ? 3600 : 86400,
          scope: 'runner:heartbeat runner:secrets runner:release',
        });
      case 'refused':
        return Response.json(
          {
            error: 'invalid_client',
            error_description: 'Client authentication failed',
          },
          {
            status: 401,
            headers: { Date: new Date(clock - 75_000).toUTCString() },
          },
        );
      case 'nonce':
        return Response.json(
          { error: 'use_dpop_nonce' },
          { status: 400, headers: { 'DPoP-Nonce': 'n-1' } },
        );
      case 'down':
        throw new TypeError('fetch failed');
      case 'hang':
        return new Promise<Response>(() => undefined);
    }
  };

  const auth = createServiceAuth(testCredential(kind), {
    fetch,
    now: () => clock,
    logger: {
      error: (message) => {
        lines.push(String(message));
      },
    },
    random: () => 0,
  });
  return {
    auth,
    lines,
    tokenRequests,
    now: () => clock,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe('the service credential client', () => {
  it.each<[string, () => Promise<void>]>([
    [
      'asks for a token by the client credentials grant with an assertion, a proof and the resource',
      async () => {
        const s = stub();
        await s.auth.authorize(get);
        expect(s.tokenRequests).toEqual([
          {
            dpop: expect.any(String),
            form: {
              grant_type: 'client_credentials',
              client_assertion_type:
                'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
              client_assertion: expect.any(String),
              resource: 'https://app.walkeros.io/api',
            },
          },
        ]);
      },
    ],
    [
      'buys at first use and renews an hour after the purchase',
      async () => {
        const s = stub();
        expect(s.tokenRequests).toHaveLength(0);
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-1');
        s.advance(HOUR - 1);
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-1');
        expect(s.tokenRequests).toHaveLength(1);
        s.advance(1);
        // The live token serves while the renewal runs.
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-1');
        expect((await s.auth.token()).token).toBe('tok-2');
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-2');
        expect(s.tokenRequests).toHaveLength(2);
        expect(s.lines).toEqual([]);
      },
    ],
    [
      'keeps the token when a renewal is refused, with one ERROR line',
      async () => {
        const s = stub('deployment', ['token', 'refused', 'refused']);
        await s.auth.authorize(get);
        s.advance(HOUR);
        expect((await s.auth.token()).token).toBe('tok-1');
        s.advance(HOUR);
        expect((await s.auth.token()).token).toBe('tok-1');
        expect(s.tokenRequests).toHaveLength(3);
        expect(s.lines).toEqual([
          expect.stringContaining(
            "The auth server refused this credential's token request (invalid_client: Client authentication failed)",
          ),
        ]);
      },
    ],
    [
      'signs when the token expired and the endpoint fails',
      async () => {
        const s = stub('deployment', ['token', 'down']);
        await s.auth.authorize(get);
        s.advance(24 * HOUR);
        const post = { method: 'POST', url: CHECK_IN, body: bytes('{}') };
        const headers = await s.auth.authorize(post);
        expect(headers.Authorization).toBeUndefined();
        await expect(
          verifyRequestSignature({
            ...post,
            headers: new Headers(headers),
            body: post.body,
            key: publicKey,
            tag: 'walkeros-app',
            now: s.now(),
          }),
        ).resolves.toMatchObject({ ok: true });
        expect(s.lines).toEqual([
          'The token request failed: fetch failed',
          'No live token: requests to https://app.walkeros.io are signed until a token is bought',
        ]);
      },
    ],
    [
      'signs at a cold start with the endpoint down, and ends signing with one line once a token is bought',
      async () => {
        const s = stub('deployment', ['down']);
        expect(await s.auth.authorize(get)).toHaveProperty('Signature-Input');
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-1');
        expect(s.lines).toEqual([
          'The token request failed: fetch failed',
          'No live token: requests to https://app.walkeros.io are signed until a token is bought',
          'A token is bought again: requests to https://app.walkeros.io carry it',
        ]);
      },
    ],
    [
      'signs when a token request never answers, after the attempt time',
      async () => {
        const s = stub('deployment', ['hang']);
        expect(await s.auth.authorize(get)).toHaveProperty('Signature-Input');
        expect(s.lines[0]).toBe(
          'The auth server did not answer within 2500 ms',
        );
      },
    ],
    [
      'drops a token the app refuses and buys once more, never twice',
      async () => {
        const s = stub();
        await s.auth.authorize(get);
        const refused = {
          status: 401,
          headers: new Headers({
            'WWW-Authenticate': 'DPoP error="invalid_token"',
          }),
        };
        expect(s.auth.answered(refused)).toBe(true);
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-2');
        expect(s.auth.answered(refused)).toBe(false);
        expect(s.tokenRequests).toHaveLength(2);
        expect(s.lines).toEqual([REFUSED_RUNNER_LINE]);
      },
    ],
    [
      'sends once more with fresh headers when the app refuses the token',
      async () => {
        const s = stub();
        const target = app(
          appAnswer(401, { 'WWW-Authenticate': 'DPoP error="invalid_token"' }),
          appAnswer(200),
        );
        const answer = await sendWithServiceAuth(s.auth, get, target.send);
        expect(answer.status).toBe(200);
        expect(target.sent.map((headers) => headers.Authorization)).toEqual([
          'DPoP tok-1',
          'DPoP tok-2',
        ]);
        expect(target.sent[1].DPoP).not.toBe(target.sent[0].DPoP);
      },
    ],
    [
      'sends once more with the nonce the app asks for, never a third time',
      async () => {
        const s = stub();
        const asks = (nonce: string) =>
          appAnswer(401, {
            'WWW-Authenticate': 'DPoP error="use_dpop_nonce"',
            'DPoP-Nonce': nonce,
          });
        const target = app(asks('r-1'), asks('r-2'));
        const answer = await sendWithServiceAuth(s.auth, get, target.send);
        expect(answer.status).toBe(401);
        expect(target.sent).toHaveLength(2);
        expect(decodeJws(target.sent[1].DPoP).payload).toMatchObject({
          nonce: 'r-1',
        });
        expect(s.tokenRequests).toHaveLength(1);
      },
    ],
    [
      'names a refused signed request by what it can mean and the clock offset, never pairing again',
      async () => {
        const s = stub('deployment', ['down']);
        expect(await s.auth.authorize(get)).toHaveProperty('Signature-Input');
        s.auth.answered({
          status: 401,
          headers: new Headers({
            'WWW-Authenticate': 'DPoP algs="ES256"',
            Date: new Date(s.now() - 90_000).toUTCString(),
          }),
        });
        expect(s.lines).toEqual([
          'The token request failed: fetch failed',
          'No live token: requests to https://app.walkeros.io are signed until a token is bought',
          "The app refused this runner's signed request (HTTP 401): its credential is not connected yet or has ended, or this clock is off; this clock is +90 s off the app's",
        ]);
      },
    ],
    [
      'drops a refused token again once another answer came between',
      async () => {
        const s = stub();
        await s.auth.authorize(get);
        const refused = {
          status: 401,
          headers: new Headers({
            'WWW-Authenticate': 'DPoP error="invalid_token"',
          }),
        };
        expect(s.auth.answered(refused)).toBe(true);
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-2');
        expect(s.auth.answered({ status: 503 })).toBe(false);
        expect(s.auth.answered(refused)).toBe(true);
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-3');
      },
    ],
    [
      'names a 403 as the route refusing the credential, never as an end',
      async () => {
        const s = stub();
        await s.auth.authorize(get);
        expect(s.auth.answered({ status: 403 })).toBe(false);
        expect(s.lines).toEqual([
          "The app's route refused this runner's credential (scope or role; HTTP 403)",
        ]);
      },
    ],
    [
      'retries once with the nonce the token endpoint asks for',
      async () => {
        const s = stub('deployment', ['nonce', 'token']);
        expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-1');
        expect(
          s.tokenRequests.map(({ dpop }) =>
            dpop === null ? null : decodeJws(dpop).payload,
          ),
        ).toEqual([
          expect.not.objectContaining({ nonce: expect.anything() }),
          expect.objectContaining({ nonce: 'n-1' }),
        ]);
        expect(s.lines).toEqual([]);
      },
    ],
    [
      'retries once with the nonce the app asks for',
      async () => {
        const s = stub();
        await s.auth.authorize(get);
        const asked = s.auth.answered({
          status: 401,
          headers: new Headers({
            'WWW-Authenticate': 'DPoP error="use_dpop_nonce"',
            'DPoP-Nonce': 'r-1',
          }),
        });
        expect(asked).toBe(true);
        const retry = await s.auth.authorize(get);
        expect(retry.Authorization).toBe('DPoP tok-1');
        expect(decodeJws(retry.DPoP).payload).toMatchObject({ nonce: 'r-1' });
        expect(s.tokenRequests).toHaveLength(1);
        expect(s.lines).toEqual([]);
      },
    ],
    [
      'names the clock offset when the assertion is refused',
      async () => {
        const s = stub('deployment', ['refused']);
        await s.auth.authorize(get);
        expect(s.lines[0]).toBe(
          "The auth server refused this credential's token request (invalid_client: Client authentication failed); this clock is +75 s off the auth server's",
        );
      },
    ],
    [
      'sends no header to another origin',
      async () => {
        const s = stub();
        await expect(
          s.auth.authorize({
            method: 'GET',
            url: 'https://storage.example/a.tgz',
          }),
        ).resolves.toEqual({});
        await expect(
          s.auth.authorize({
            method: 'GET',
            url: 'http://app.walkeros.io/api',
          }),
        ).resolves.toEqual({});
        expect(s.tokenRequests).toHaveLength(0);
      },
    ],
    [
      'buys an unbound bearer with no proof for bound: false',
      async () => {
        const s = stub('automation');
        await expect(s.auth.token({ bound: false })).resolves.toEqual({
          token: 'tok-1',
          type: 'Bearer',
          expiresAt: new Date(T0 + HOUR),
        });
        expect(s.tokenRequests[0].dpop).toBeNull();
      },
    ],
    [
      'signs nothing for an automation with no token and states the fact',
      async () => {
        const s = stub('automation', ['down']);
        await expect(s.auth.authorize(get)).rejects.toThrow(
          'The token request failed: fetch failed',
        );
        expect(s.lines).toEqual(['The token request failed: fetch failed']);
      },
    ],
  ])('%s', async (_name, run) => {
    await run();
  });

  it.each<[string, unknown, { status: number } | undefined]>([
    [
      "the app's own 401",
      new ChannelError('HTTP 401', 'refused', { status: 401, hop: 'origin' }),
      { status: 401 },
    ],
    [
      "the storage's 403 after the redirect",
      new ChannelError('HTTP 403', 'refused', { status: 403, hop: 'redirect' }),
      undefined,
    ],
    [
      'a transport failure',
      new ChannelError('fetch failed', 'transport', { hop: 'origin' }),
      undefined,
    ],
    ['another error', new Error('HTTP 401'), undefined],
  ])('reads the app answer of %s', (_name, error, answer) => {
    expect(appAnswerOf(error)).toEqual(answer);
  });
});
