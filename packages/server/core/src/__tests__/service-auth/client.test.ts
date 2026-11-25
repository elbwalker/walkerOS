import type { PublicEcJwk, ServiceTargetKind } from '@walkeros/core';
import { ChannelError, conditionalGet } from '../../channel';
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
const ENDED_RUNNER_LINE =
  "The auth server refused this runner's credential (invalid_client: The client assertion is not valid.): (replaced, revoked or ended); a self-hosted runner is paired again on its Self-hosted tab";
const ENDED_AUTOMATION_LINE =
  "The auth server refused this automation's credential (invalid_client: The client assertion is not valid.): (revoked or ended)";
const PROOF_REFUSED_LINE =
  "The auth server refused this credential's token request (invalid_dpop_proof: The DPoP proof is not valid.)";
const DOWN_LINE = 'The token request failed: fetch failed';
const SIGNING_LINE =
  'No live token: requests to https://app.walkeros.io are signed until a token is bought';
const SIGNED_REFUSED_LINE =
  "The app refused this runner's signed request (HTTP 401): its credential is not connected yet or has ended, or this clock is off";
const freshTokenLine = (holder: string) =>
  `The app refused a token the auth server had just issued for this ${holder}'s credential (HTTP 401); its tokens are for https://app.walkeros.io/api`;

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

/** The app's 401 to a token it does not take. */
const tokenRefused = () =>
  appAnswer(401, {
    'WWW-Authenticate': 'DPoP error="invalid_token", algs="ES256"',
  });

/** The app's 401 to a signed request: the challenge names no error. */
const signatureRefused = () =>
  appAnswer(401, { 'WWW-Authenticate': 'DPoP algs="ES256"' });

/** A refused token request: its OAuth error, and how far this clock is ahead of the answer's `Date`. */
interface Refusal {
  error: 'invalid_client' | 'invalid_dpop_proof';
  aheadMs: number;
}

/** The token endpoint's descriptions, as the auth server words them. */
const DESCRIPTIONS: Record<Refusal['error'], string> = {
  invalid_client: 'The client assertion is not valid.',
  invalid_dpop_proof: 'The DPoP proof is not valid.',
};

/** How the stub token endpoint answers one request; `refused` is `invalid_client`, 75 s ahead. */
type TokenAnswer = 'token' | 'refused' | 'down' | 'nonce' | 'hang' | Refusal;

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

  const refusal = ({ error, aheadMs }: Refusal) =>
    Response.json(
      { error, error_description: DESCRIPTIONS[error] },
      {
        status: error === 'invalid_client' ? 401 : 400,
        headers: { Date: new Date(clock - aheadMs).toUTCString() },
      },
    );

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
    const answer = queue.shift() || 'token';
    if (typeof answer === 'object') return refusal(answer);
    switch (answer) {
      case 'token':
        issued += 1;
        return Response.json({
          access_token: `tok-${issued}`,
          token_type: dpop === null ? 'Bearer' : 'DPoP',
          expires_in: dpop === null ? 3600 : 86400,
          scope: 'runner:heartbeat runner:secrets runner:release',
        });
      case 'refused':
        return refusal({ error: 'invalid_client', aheadMs: 75_000 });
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
          `${ENDED_RUNNER_LINE}; this clock is +75 s off the auth server's`,
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
      'sends once more with fresh headers when the app refuses the token, and writes no line when that passes',
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
        expect(s.lines).toEqual([]);
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

  /** The lines an automation's first request writes when the token endpoint refuses the purchase. */
  async function refusedPurchaseLines(refusal: Refusal): Promise<string[]> {
    const s = stub('automation', [refusal]);
    await expect(s.auth.authorize(get)).rejects.toThrow(Error);
    return s.lines;
  }

  /** The lines a runner writes when the app refuses its signed request, this clock `aheadMs` ahead of the answer's `Date`. */
  async function refusedSignatureLines(aheadMs: number): Promise<string[]> {
    const s = stub('deployment', ['down']);
    await s.auth.authorize(get);
    s.auth.answered({
      status: 401,
      headers: new Headers({
        'WWW-Authenticate': 'DPoP algs="ES256"',
        Date: new Date(s.now() - aheadMs).toUTCString(),
      }),
    });
    return s.lines;
  }

  it.each<[string, () => Promise<string[]>, string[]]>([
    [
      'an app that refuses every token at one route: one line naming the resource, two purchases, no end',
      async () => {
        const s = stub('automation');
        const target = app(tokenRefused(), tokenRefused());
        const answer = await sendWithServiceAuth(s.auth, get, target.send);
        expect([
          answer.status,
          target.sent.length,
          s.tokenRequests.length,
        ]).toEqual([401, 2, 2]);
        return s.lines;
      },
      [freshTokenLine('automation')],
    ],
    [
      "a revoked automation: the token endpoint's line with the end words, only",
      async () => {
        const s = stub('automation', [
          { error: 'invalid_client', aheadMs: 1_000 },
        ]);
        const target = app();
        await expect(
          sendWithServiceAuth(s.auth, get, target.send),
        ).rejects.toThrow(ENDED_AUTOMATION_LINE);
        expect(target.sent).toEqual([]);
        return s.lines;
      },
      [ENDED_AUTOMATION_LINE],
    ],
    [
      'a revoked runner holding a live token: no line at the first 401, then the end with the re-pair, then the signature line, each once',
      async () => {
        const ended: Refusal = { error: 'invalid_client', aheadMs: 0 };
        const s = stub('deployment', ['token', ended, ended]);
        await s.auth.authorize(get);
        const target = app(
          tokenRefused(),
          signatureRefused(),
          signatureRefused(),
        );
        await sendWithServiceAuth(s.auth, get, target.send);
        await sendWithServiceAuth(s.auth, get, target.send);
        expect(target.sent.map((headers) => headers.Authorization)).toEqual([
          'DPoP tok-1',
          undefined,
          undefined,
        ]);
        return s.lines;
      },
      [ENDED_RUNNER_LINE, SIGNING_LINE, SIGNED_REFUSED_LINE],
    ],
    [
      'a caller that does not retry: no line at the first 401, the fresh-token line at its next answer',
      async () => {
        const s = stub();
        const target = app(tokenRefused(), tokenRefused());
        const checkIn = async () => {
          s.auth.answered(await target.send(await s.auth.authorize(get)));
        };
        await checkIn();
        expect(s.lines).toEqual([]);
        await checkIn();
        return s.lines;
      },
      [freshTokenLine('runner')],
    ],
    [
      'invalid_client 27 s ahead of the auth server: no clock note',
      () => refusedPurchaseLines({ error: 'invalid_client', aheadMs: 27_000 }),
      [ENDED_AUTOMATION_LINE],
    ],
    [
      'invalid_client 29 s ahead of the auth server: the clock note',
      () => refusedPurchaseLines({ error: 'invalid_client', aheadMs: 29_000 }),
      [`${ENDED_AUTOMATION_LINE}; this clock is +29 s off the auth server's`],
    ],
    [
      'invalid_client 29 s behind the auth server: the clock note',
      () => refusedPurchaseLines({ error: 'invalid_client', aheadMs: -29_000 }),
      [`${ENDED_AUTOMATION_LINE}; this clock is -29 s off the auth server's`],
    ],
    [
      'invalid_dpop_proof 57 s ahead of the auth server: no clock note',
      () =>
        refusedPurchaseLines({ error: 'invalid_dpop_proof', aheadMs: 57_000 }),
      [PROOF_REFUSED_LINE],
    ],
    [
      'invalid_dpop_proof 59 s ahead of the auth server: the clock note',
      () =>
        refusedPurchaseLines({ error: 'invalid_dpop_proof', aheadMs: 59_000 }),
      [`${PROOF_REFUSED_LINE}; this clock is +59 s off the auth server's`],
    ],
    [
      'a refused proof, then the end at the next purchase: both lines, the end never swallowed',
      async () => {
        const s = stub('automation', [
          { error: 'invalid_dpop_proof', aheadMs: 0 },
          { error: 'invalid_client', aheadMs: 0 },
        ]);
        await expect(s.auth.authorize(get)).rejects.toThrow(PROOF_REFUSED_LINE);
        await expect(s.auth.authorize(get)).rejects.toThrow(
          ENDED_AUTOMATION_LINE,
        );
        return s.lines;
      },
      [PROOF_REFUSED_LINE, ENDED_AUTOMATION_LINE],
    ],
    [
      'a signed request refused 57 s off the app: no clock note',
      () => refusedSignatureLines(57_000),
      [DOWN_LINE, SIGNING_LINE, SIGNED_REFUSED_LINE],
    ],
    [
      'a signed request refused 59 s off the app: the clock note',
      () => refusedSignatureLines(59_000),
      [
        DOWN_LINE,
        SIGNING_LINE,
        `${SIGNED_REFUSED_LINE}; this clock is +59 s off the app's`,
      ],
    ],
  ])('names a refusal by what it holds: %s', async (_name, run, lines) => {
    expect(await run()).toEqual(lines);
  });

  it.each<[string, ServiceTargetKind, Record<string, string>, string]>([
    [
      "a runner's, with the answer's Date",
      'deployment',
      { Date: new Date(T0 - 90_000).toUTCString() },
      "The app refused this runner's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; this clock is +90 s off the app's; pairing again does not help",
    ],
    [
      "a runner's, 57 s off the app's: inside the proof's window, no note",
      'deployment',
      { Date: new Date(T0 - 57_000).toUTCString() },
      "The app refused this runner's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; pairing again does not help",
    ],
    [
      "a runner's, 59 s off the app's",
      'deployment',
      { Date: new Date(T0 - 59_000).toUTCString() },
      "The app refused this runner's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; this clock is +59 s off the app's; pairing again does not help",
    ],
    [
      "a runner's, with no Date",
      'deployment',
      {},
      "The app refused this runner's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; pairing again does not help",
    ],
    [
      "a data agent's",
      'data-plane',
      {},
      "The app refused this data agent's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; pairing again does not help",
    ],
    [
      "an automation's",
      'automation',
      {},
      "The app refused this automation's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; a new automation does not help",
    ],
  ])(
    'names a refused DPoP proof, %s, by its own line and keeps the token',
    async (_name, kind, extra, line) => {
      const s = stub(kind);
      await s.auth.authorize(get);
      const refused = new Headers({
        'WWW-Authenticate': 'DPoP error="invalid_dpop_proof", algs="ES256"',
        ...extra,
      });
      expect(s.auth.answered({ status: 401, headers: refused })).toBe(false);
      expect((await s.auth.authorize(get)).Authorization).toBe('DPoP tok-1');
      expect(s.tokenRequests).toHaveLength(1);
      expect(s.lines).toEqual([line]);
    },
  );

  it('hears from a ChannelError the refused proof, with the clock offset, not a refused credential', async () => {
    const s = stub();
    const answer = new Response(null, {
      status: 401,
      headers: {
        'WWW-Authenticate': 'DPoP error="invalid_dpop_proof", algs="ES256"',
        Date: new Date(T0 - 90_000).toUTCString(),
      },
    });
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(answer);
    try {
      const failed = await conditionalGet({
        url: CHECK_IN,
        authorize: s.auth.authorize,
        timeoutMs: 1000,
        maxBytes: 1024,
      }).catch((error: unknown) => error);
      const heard = appAnswerOf(failed);
      expect(heard?.status).toBe(401);
      if (heard) s.auth.answered(heard);
    } finally {
      fetch.mockRestore();
    }
    expect(s.lines).toEqual([
      "The app refused this runner's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; this clock is +90 s off the app's; pairing again does not help",
    ]);
  });

  const refusedHeaders = new Headers({ 'WWW-Authenticate': 'DPoP' });

  it.each<[string, unknown, ReturnType<typeof appAnswerOf>]>([
    [
      "the app's own 401",
      new ChannelError('HTTP 401', 'refused', { status: 401, hop: 'origin' }),
      { status: 401 },
    ],
    [
      "the app's own 401 with its headers",
      new ChannelError('HTTP 401', 'refused', {
        status: 401,
        hop: 'origin',
        headers: refusedHeaders,
      }),
      { status: 401, headers: refusedHeaders },
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
