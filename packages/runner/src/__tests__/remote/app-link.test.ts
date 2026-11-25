import {
  encodeServiceCredential,
  redactLine,
  SERVICE_CREDENTIAL_PREFIX,
  type Logger,
  type ServiceCredential,
} from '@walkeros/core';
import { createKnownValues } from '@walkeros/core/node';
import {
  APP_SIGNATURE_TAG,
  ChannelError,
  conditionalGet,
  contentDigest,
  createDoorCheck,
  SIGNATURE_TAGS,
  verifyRequestSignature,
} from '@walkeros/server-core';
import { releaseUrl } from '../../api-paths.js';
import {
  appCall,
  appLinkFromEnvironment,
  type AppLink,
} from '../../remote/app-link.js';
import { ReleaseRefusal } from '../../remote/release-document.js';
import {
  CLOSED_ISSUER,
  TEST_APP,
  TEST_DEPLOYMENT,
  TEST_ISSUER,
  testCredential,
} from '../helpers/credential.js';
import { createMockLogger } from '../helpers/mock-logger.js';
import { sealSecretSet } from '../helpers/seal.js';
import { startStandInApp } from '../helpers/stand-in-app.js';
import {
  recordingLogger,
  until,
  type Line,
} from '../helpers/supervisor-harness.js';

const METADATA = `${TEST_ISSUER}/.well-known/oauth-authorization-server`;
const TOKEN_ENDPOINT = `${TEST_ISSUER}/api/services/token`;
/** A 401 tied to no token the client holds: it tells no end. */
const REFUSED_LINE = "The app refused this runner's credential (HTTP 401)";
/** What `answered` is handed. */
type Answer = { status: number; headers?: Headers };
/** A fixed clock for the rows that read the clock offset. */
const NOW = Date.parse('2026-11-20T10:00:00.000Z');

let credential: ServiceCredential;
let raw: string;

beforeAll(async () => {
  ({ credential, raw } = await testCredential());
});

function linkOf(
  env: NodeJS.ProcessEnv,
  logger: Logger.Instance = createMockLogger(),
): AppLink {
  return appLinkFromEnvironment({
    env,
    logger,
    knownValues: createKnownValues(),
  });
}

function errorsOf(lines: Line[]): string[] {
  return lines
    .filter((line) => line.level === 'error')
    .map((line) => line.message);
}

/** The auth server as the client reads it: discovery, and a token endpoint that answers or hangs. */
function authServer(token: 'answers' | 'hangs') {
  const seen: { tokenSignal?: AbortSignal } = {};
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === METADATA)
      return Response.json({
        issuer: TEST_ISSUER,
        service_token_endpoint: TOKEN_ENDPOINT,
        dpop_signing_alg_values_supported: ['ES256'],
      });
    if (url !== TOKEN_ENDPOINT) return new Response(null, { status: 404 });
    if (token === 'hangs') {
      seen.tokenSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    }
    return Response.json({
      access_token: 'tok-1',
      token_type: 'DPoP',
      expires_in: 86400,
      scope: 'runner:heartbeat runner:secrets runner:release',
    });
  };
  return { fetch, seen };
}

describe('appLinkFromEnvironment', () => {
  it.each<[string, () => Promise<string | undefined>, string]>([
    [
      'an unset variable',
      async () => undefined,
      'WALKEROS_CREDENTIAL is not set',
    ],
    [
      'a value that is no credential',
      async () => 'wos_run_left_over',
      'WALKEROS_CREDENTIAL is not a walkerOS credential',
    ],
    [
      'a credential with a member out of shape',
      async () =>
        SERVICE_CREDENTIAL_PREFIX +
        Buffer.from(JSON.stringify({ ...credential, v: 2 })).toString(
          'base64url',
        ),
      'WALKEROS_CREDENTIAL is not a walkerOS credential (v)',
    ],
    [
      "a credential whose encryption key id is not that key's thumbprint",
      async () =>
        encodeServiceCredential({
          ...credential,
          enc: { ...credential.enc, kid: credential.sig.kid },
        }),
      'WALKEROS_CREDENTIAL is not a walkerOS credential (enc.kid)',
    ],
    [
      "an automation's credential",
      async () => (await testCredential('automation')).raw,
      "WALKEROS_CREDENTIAL is not a deployment's credential (kind automation)",
    ],
    [
      "a data agent's credential",
      async () => (await testCredential('data-plane')).raw,
      "WALKEROS_CREDENTIAL is not a deployment's credential (kind data-plane)",
    ],
  ])(
    'refuses %s with its fact and leaves no variable behind',
    async (_case, value, fact) => {
      const set = await value();
      const env: NodeJS.ProcessEnv = {
        PATH: '/usr/bin',
        ...(set !== undefined && { WALKEROS_CREDENTIAL: set }),
      };
      let message: string | undefined;
      try {
        linkOf(env);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toBe(fact);
      expect(redactLine(fact)).toBe(fact);
      expect(env).toEqual({ PATH: '/usr/bin' });
    },
  );

  it('answers the origin, the deployment and the key id of the credential, a mixed-case id as written', async () => {
    const mixed = await testCredential('deployment', {
      resource: 'https://app.example.test:8443/api',
      id: 'dep_AbC-1_x',
    });

    const link = linkOf({ WALKEROS_CREDENTIAL: mixed.raw });

    expect([link.origin, link.deploymentId, link.keyId]).toEqual([
      'https://app.example.test:8443',
      'dep_AbC-1_x',
      mixed.credential.enc.kid,
    ]);
  });

  it('signs a request to the origin while the token endpoint is down', async () => {
    const closed = await testCredential('deployment', { iss: CLOSED_ISSUER });
    const link = linkOf({ WALKEROS_CREDENTIAL: closed.raw });
    const url = `${TEST_APP}/api/runner/release`;

    const headers = new Headers(await link.authorize({ method: 'GET', url }));

    const { kty, crv, x, y } = closed.credential.sig;
    const verified = await verifyRequestSignature({
      method: 'GET',
      url,
      headers,
      body: new Uint8Array(),
      key: { kty, crv, x, y },
      tag: APP_SIGNATURE_TAG,
    });
    expect([headers.has('authorization'), verified.ok]).toEqual([false, true]);
  });

  it('sends a DPoP token and its proof once the auth server sells one', async () => {
    const link = appLinkFromEnvironment({
      env: { WALKEROS_CREDENTIAL: raw },
      logger: createMockLogger(),
      knownValues: createKnownValues(),
      serviceAuth: { fetch: authServer('answers').fetch },
    });

    await expect(
      link.authorize({ method: 'GET', url: `${TEST_APP}/api/runner/release` }),
    ).resolves.toEqual({
      Authorization: 'DPoP tok-1',
      DPoP: expect.any(String),
    });
  });

  it('writes the refused line once per change of state', () => {
    const lines: Line[] = [];
    const link = linkOf({ WALKEROS_CREDENTIAL: raw }, recordingLogger(lines));

    link.answered({ status: 401 });
    link.answered({ status: 401 });
    link.answered({ status: 200 });
    link.answered({ status: 401 });

    expect(errorsOf(lines)).toEqual([REFUSED_LINE, REFUSED_LINE]);
  });

  it('writes the refused-proof line with the clock offset when the app refuses the DPoP proof', async () => {
    const standIn = await startStandInApp();
    try {
      const atStandIn = await testCredential('deployment', {
        resource: `${standIn.origin}/api`,
      });
      const lines: Line[] = [];
      const link = appLinkFromEnvironment({
        env: { WALKEROS_CREDENTIAL: atStandIn.raw },
        logger: recordingLogger(lines),
        knownValues: createKnownValues(),
        serviceAuth: { fetch: authServer('answers').fetch, now: () => NOW },
      });
      standIn.setAnswer('release', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'DPoP error="invalid_dpop_proof"',
          Date: new Date(NOW - 3_600_000).toUTCString(),
        },
      });

      await expect(
        appCall(
          link,
          () =>
            conditionalGet({
              url: releaseUrl(link.origin),
              authorize: link.authorize,
              timeoutMs: 5000,
              maxBytes: 65_536,
            }),
          (answer) => answer.status,
        ),
      ).rejects.toBeInstanceOf(ChannelError);
      expect(errorsOf(lines)).toEqual([
        "The app refused this runner's DPoP proof (HTTP 401): this clock is off or the request URL is not the app's; this clock is +3600 s off the app's; pairing again does not help",
      ]);
    } finally {
      await standIn.stop();
    }
  });

  it('aborts a token request in flight on close', async () => {
    const auth = authServer('hangs');
    const link = appLinkFromEnvironment({
      env: { WALKEROS_CREDENTIAL: raw },
      logger: createMockLogger(),
      knownValues: createKnownValues(),
      serviceAuth: { fetch: auth.fetch },
    });
    const pending = link
      .authorize({ method: 'GET', url: `${TEST_APP}/api/runner/release` })
      .catch(() => undefined);
    await until(() => auth.seen.tokenSignal !== undefined);

    link.close();

    expect(auth.seen.tokenSignal?.aborted).toBe(true);
    await pending;
  });
});

describe('appCall', () => {
  const headers = new Headers({ 'WWW-Authenticate': 'DPoP error="x"' });

  it.each<[string, () => Promise<number>, Answer[]]>([
    ['an answer the call took', async () => 304, [{ status: 304 }]],
    [
      "the app's own refusal, with its headers",
      async () => {
        throw new ChannelError('HTTP 401', 'refused', {
          status: 401,
          hop: 'origin',
          headers,
        });
      },
      [{ status: 401, headers }],
    ],
    [
      "storage's refusal after the redirect",
      async () => {
        throw new ChannelError('HTTP 403', 'refused', {
          status: 403,
          hop: 'redirect',
          headers,
        });
      },
      [],
    ],
    [
      'a failure with no answer',
      async () => {
        throw new ChannelError('Request timed out after 10 ms', 'timeout', {
          hop: 'origin',
        });
      },
      [],
    ],
  ])('hands `answered` %s', async (_case, call, handed) => {
    const answers: Answer[] = [];

    await appCall(
      { answered: (answer) => answers.push(answer) },
      call,
      (status) => status,
    ).catch(() => undefined);

    expect(answers).toEqual(handed);
  });

  it('throws what the call threw', async () => {
    const failure = new ChannelError('HTTP 401', 'refused', {
      status: 401,
      hop: 'origin',
    });

    await expect(
      appCall(
        { answered: () => {} },
        async () => {
          throw failure;
        },
        () => 200,
      ),
    ).rejects.toBe(failure);
  });
});

describe('readSecretSet', () => {
  const expected = { deployment: TEST_DEPLOYMENT, sequence: 17 };
  /** Built from entries, so `__proto__` is a name of its own. */
  const values: Record<string, string> = Object.fromEntries([
    ['API_KEY', 'value-abc123'],
    ['__proto__', 'value-proto-v17'],
  ]);

  it('opens a set sealed to the credential, a value named __proto__ kept as its own', async () => {
    const link = linkOf({ WALKEROS_CREDENTIAL: raw });
    const sealed = await sealSecretSet({
      key: credential.enc,
      ...expected,
      values,
    });

    const opened = await link.readSecretSet(sealed, expected);

    expect(Object.entries(opened)).toEqual([
      ['API_KEY', 'value-abc123'],
      ['__proto__', 'value-proto-v17'],
    ]);
  });

  it.each<[string, () => Promise<Uint8Array>, string]>([
    [
      'a set sealed to another key',
      async () =>
        sealSecretSet({
          key: (await testCredential()).credential.enc,
          ...expected,
          values,
        }),
      'The sealed set is sealed to another key',
    ],
    [
      'a set naming another deployment',
      () =>
        sealSecretSet({
          key: credential.enc,
          deployment: 'dep_other',
          sequence: 17,
          values,
        }),
      "The sealed set's header names another deployment",
    ],
    [
      'a set naming another sequence',
      () =>
        sealSecretSet({
          key: credential.enc,
          deployment: TEST_DEPLOYMENT,
          sequence: 16,
          values,
        }),
      "The sealed set's header names another sequence",
    ],
    [
      'bytes that are no JWE',
      async () =>
        new TextEncoder().encode(
          JSON.stringify({ ...expected, values: { API_KEY: 'value-abc123' } }),
        ),
      'The sealed set is not a compact JWE of five parts',
    ],
  ])(
    'refuses %s as secret-set, naming the fact',
    async (_case, sealed, fact) => {
      const link = linkOf({ WALKEROS_CREDENTIAL: raw });
      let refusal: unknown;
      try {
        await link.readSecretSet(await sealed(), expected);
      } catch (error) {
        refusal = error;
      }

      expect(refusal).toBeInstanceOf(ReleaseRefusal);
      expect(refusal).toMatchObject({
        check: 'secret-set',
        sequence: 17,
        message: `Release v17 refused (secret-set: ${fact})`,
      });
    },
  );
});

describe('signStep', () => {
  it('signs a POST to a local door with the ingest tag, which the door check passes', async () => {
    const link = linkOf({ WALKEROS_CREDENTIAL: raw });
    const body = new TextEncoder().encode('{"name":"page view"}');
    const digest = contentDigest(body);
    const { kty, crv, x, y, kid } = credential.sig;
    const door = createDoorCheck({
      tag: SIGNATURE_TAGS.ingest,
      lookup: async (keyid) => (keyid === kid ? { kty, crv, x, y } : undefined),
      startedAt: 0,
    });

    const signed = await link.signStep({
      method: 'POST',
      url: 'http://127.0.0.1:8080/ingest',
      contentDigest: digest,
    });

    await expect(
      door.check({
        origin: 'http://127.0.0.1:8080',
        method: 'POST',
        target: '/ingest',
        headers: new Headers({ ...signed, 'Content-Digest': digest }),
        body,
      }),
    ).resolves.toEqual({ ok: true, keyid: kid });
  });

  it.each<[string, { method: string; url: string }, string]>([
    [
      'a GET',
      { method: 'GET', url: 'http://127.0.0.1:8080/ingest' },
      'The door signer signs POST requests only',
    ],
    [
      "the app's origin",
      { method: 'POST', url: `${TEST_APP}/api/runner/check-in` },
      'The door signer does not sign for the app or its auth server',
    ],
    [
      "the issuer's origin",
      { method: 'POST', url: `${TEST_ISSUER}/api/ingest` },
      'The door signer does not sign for the app or its auth server',
    ],
  ])("refuses %s with the door rule's fact", async (_case, request, fact) => {
    const link = linkOf({ WALKEROS_CREDENTIAL: raw });

    await expect(
      link.signStep({
        ...request,
        contentDigest: contentDigest(new Uint8Array()),
      }),
    ).rejects.toThrow(new Error(fact));
  });
});
