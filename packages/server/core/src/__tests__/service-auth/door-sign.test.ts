import type { PrivateEcJwk, PublicEcJwk } from '@walkeros/core';
import type { DoorDecision } from '../../service-auth/door-check';
import { createDoorCheck } from '../../service-auth/door-check';
import type { DoorTag } from '../../service-auth/door-sign';
import {
  assertDoorTarget,
  createDoorAuthorize,
  signDoorRequest,
} from '../../service-auth/door-sign';
import { contentDigest, signRequest } from '../../service-auth/signature';
import {
  EMPTY_DIGEST,
  HELLO_WORLD_BODY,
  HELLO_WORLD_DIGEST,
  TEST_KEY_ECC_P256,
  TEST_KEY_THUMBPRINT,
  testCredential,
} from './rfc9421-vectors';

const T0 = 1_800_000_000_000;
const INGEST = 'https://ingest.walkeros.io/events';
const credential = testCredential('deployment');
const { kty, crv, x, y } = TEST_KEY_ECC_P256;
const publicKey: PublicEcJwk = { kty, crv, x, y };
const signingKey: PrivateEcJwk = credential.sig;

const bytes = (text: string) => new Uint8Array(Buffer.from(text, 'utf8'));
const body = bytes(HELLO_WORLD_BODY);
const pass: DoorDecision = { ok: true, keyid: TEST_KEY_THUMBPRINT };

/** What a door at the URL's origin, with this tag, answers to these headers and this body. */
function atDoor(
  url: string,
  headers: Record<string, string>,
  tag: DoorTag = 'walkeros-ingest',
): Promise<DoorDecision> {
  const target = new URL(url);
  return createDoorCheck({
    tag,
    lookup: async (keyid) =>
      keyid === TEST_KEY_THUMBPRINT ? publicKey : undefined,
    startedAt: T0 - 60_000,
    now: () => T0,
  }).check({
    origin: target.origin,
    method: 'POST',
    target: `${target.pathname}${target.search}`,
    headers: new Headers(headers),
    body,
  });
}

/** `created` and `nonce` of a Signature-Input. */
function paramsOf(signatureInput: string) {
  return {
    created: Number(/;created=(\d+)/.exec(signatureInput)?.[1]),
    nonce: /;nonce="([^"]*)"/.exec(signatureInput)?.[1],
  };
}

/** What the door rule says of a request: `signs`, or the fact it throws. */
function ruleOf(method: string, url: string): string {
  try {
    assertDoorTarget({ method, url }, credential);
    return 'signs';
  } catch (error) {
    return error instanceof Error ? error.message : 'a throw that is no Error';
  }
}

describe('assertDoorTarget', () => {
  const POST_ONLY = 'The door signer signs POST requests only';
  const HTTPS_OR_LOCAL =
    'The door signer signs https, or http to a loopback or private host, only';
  const NOT_THE_APP =
    'The door signer does not sign for the app or its auth server';

  it.each<[string, string, string]>([
    ['GET', 'https://ingest.example.com/x', POST_ONLY],
    ['PUT', 'https://ingest.example.com/x', POST_ONLY],
    ['POST', 'http://ingest.example.com', HTTPS_OR_LOCAL],
    ['POST', 'https://ingest.example.com/x', 'signs'],
    ['POST', 'http://127.0.0.1:9000', 'signs'],
    ['POST', 'http://10.0.0.5', 'signs'],
    ['POST', 'http://192.168.1.2', 'signs'],
    ['POST', 'http://localhost:9000', 'signs'],
    ['POST', 'https://app.walkeros.io/elsewhere', NOT_THE_APP],
    ['POST', 'https://auth.walkeros.io/api/services/token', NOT_THE_APP],
  ])('answers a %s to %s with: %s', (method, url, expected) => {
    expect(ruleOf(method, url)).toBe(expected);
  });
});

describe('createDoorAuthorize', () => {
  it('signs every call anew, with a fresh 16-byte nonce and created', async () => {
    let clock = T0;
    const authorize = createDoorAuthorize(credential, { now: () => clock });
    const first = await authorize({ method: 'POST', url: INGEST, body });
    clock += 1_000;
    const second = await authorize({ method: 'POST', url: INGEST, body });
    const [a, b] = [first, second].map((headers) =>
      paramsOf(headers['Signature-Input']),
    );
    expect({
      created: [a.created, b.created],
      nonceBytes: [a.nonce, b.nonce].map(
        (nonce) => Buffer.from(nonce ?? '', 'base64url').length,
      ),
      fresh: a.nonce !== b.nonce,
    }).toEqual({
      created: [T0 / 1000, T0 / 1000 + 1],
      nonceBytes: [16, 16],
      fresh: true,
    });
  });

  it.each([
    ['the exact body bytes', body, HELLO_WORLD_DIGEST],
    ['no body, as the empty body', undefined, EMPTY_DIGEST],
  ])('digests %s as RFC 9530 does', async (_name, sent, digest) => {
    const authorize = createDoorAuthorize(credential, { now: () => T0 });
    const headers = await authorize({
      method: 'POST',
      url: INGEST,
      body: sent,
    });
    expect(headers['Content-Digest']).toBe(digest);
  });

  it.each<[DoorTag, DoorDecision]>([
    ['walkeros-ingest', pass],
    ['walkeros-read', { ok: false, status: 403, reason: 'tag' }],
  ])('signs with the ingest tag: a %s door answers', async (tag, decision) => {
    const authorize = createDoorAuthorize(credential, { now: () => T0 });
    const headers = await authorize({ method: 'POST', url: INGEST, body });
    await expect(atDoor(INGEST, headers, tag)).resolves.toEqual(decision);
  });

  it.each([
    'http://127.0.0.1:8123/?query=INSERT%20INTO%20events%20FORMAT%20JSONEachRow',
    'http://172.17.0.1',
    'https://clickhouse.example.com:8443/',
    INGEST,
  ])('signs a POST to %s, which a door there takes', async (url) => {
    const authorize = createDoorAuthorize(credential, { now: () => T0 });
    const headers = await authorize({ method: 'POST', url, body });
    await expect(atDoor(url, headers)).resolves.toEqual(pass);
  });

  it.each<[string, () => Promise<unknown>, string]>([
    [
      'a GET',
      () => createDoorAuthorize(credential)({ method: 'GET', url: INGEST }),
      'The door signer signs POST requests only',
    ],
    [
      'plain http to a public host',
      () =>
        createDoorAuthorize(credential)({
          method: 'POST',
          url: 'http://203.0.113.1/events',
          body,
        }),
      'The door signer signs https, or http to a loopback or private host, only',
    ],
    [
      "a URL on the credential's resource origin",
      () =>
        createDoorAuthorize(credential)({
          method: 'POST',
          url: 'https://app.walkeros.io/api/runner/check-in',
          body,
        }),
      'The door signer does not sign for the app or its auth server',
    ],
    [
      "a URL on the credential's issuer origin",
      () =>
        createDoorAuthorize(credential)({
          method: 'POST',
          url: 'https://auth.walkeros.io/api/services/token',
          body,
        }),
      'The door signer does not sign for the app or its auth server',
    ],
    [
      'a digest of another form, which could add lines to the signature base',
      () =>
        signDoorRequest({
          method: 'POST',
          url: INGEST,
          contentDigest: `${contentDigest(body)}\n"@signature-params": ()`,
          key: signingKey,
          tag: 'walkeros-ingest',
        }),
      'The content digest is not a sha-256 Content-Digest',
    ],
  ])('refuses %s with a fact and no header', async (_name, call, fact) => {
    await expect(call()).rejects.toThrow(new Error(fact));
  });
});

describe('signDoorRequest', () => {
  it('signs from the digest what signRequest signs from the body, and a door takes it', async () => {
    const tag: DoorTag = 'walkeros-ingest';
    const request = {
      method: 'POST',
      url: INGEST,
      key: signingKey,
      tag,
      created: T0 / 1000,
      nonce: 'nonce-1',
    };
    const fromBody = await signRequest({ ...request, body });
    const fromDigest = await signDoorRequest({
      ...request,
      contentDigest: contentDigest(body),
    });
    expect({
      signatureInput: fromDigest['Signature-Input'],
      atDoor: await atDoor(INGEST, {
        ...fromDigest,
        'Content-Digest': contentDigest(body),
      }),
    }).toEqual({ signatureInput: fromBody['Signature-Input'], atDoor: pass });
  });
});
