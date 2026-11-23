import type { PrivateEcJwk, PublicEcJwk } from '@walkeros/core';
import type { SignatureRefusal } from '../../service-auth/signature';
import {
  contentDigest,
  signRequest,
  signatureBase,
  verifyRequestSignature,
  verifySignatureBase,
} from '../../service-auth/signature';
import {
  B24_SIGNATURE,
  B24_SIGNATURE_BASE,
  EMPTY_DIGEST,
  FIXED_SET_REQUEST,
  FIXED_SET_SIGNATURE_BASE,
  HELLO_WORLD_BODY,
  HELLO_WORLD_DIGEST,
  TEST_KEY_ECC_P256,
  TEST_KEY_THUMBPRINT,
} from './rfc9421-vectors';

const { kty, crv, x, y, d } = TEST_KEY_ECC_P256;
const publicKey: PublicEcJwk = { kty, crv, x, y };
const signingKey: PrivateEcJwk = {
  kty,
  crv,
  x,
  y,
  d,
  kid: TEST_KEY_THUMBPRINT,
  use: 'sig',
  alg: 'ES256',
};

const bytes = (text: string) => new Uint8Array(Buffer.from(text, 'utf8'));
const fromBase64 = (text: string) =>
  new Uint8Array(Buffer.from(text, 'base64'));

/** The bytes inside `sig1=:...:`. */
function signatureBytes(field: string): Uint8Array {
  return fromBase64(field.slice('sig1=:'.length, -1));
}

describe('RFC 9421 signatures', () => {
  it("verifies Appendix B.2.4's published signature with test-key-ecc-p256", async () => {
    await expect(
      verifySignatureBase(
        B24_SIGNATURE_BASE,
        fromBase64(B24_SIGNATURE),
        publicKey,
      ),
    ).resolves.toBe(true);
  });

  it('builds the signature base of the fixed set byte for byte', async () => {
    const { method, url, body, created, nonce, tag } = FIXED_SET_REQUEST;
    const signed = await signRequest({
      method,
      url,
      body: bytes(body),
      key: signingKey,
      tag,
      created,
      nonce,
    });
    const base = signatureBase({
      method,
      url,
      contentDigest: signed['Content-Digest'],
      params: signed['Signature-Input'].slice('sig1='.length),
    });
    expect(base).toBe(FIXED_SET_SIGNATURE_BASE);
    await expect(
      verifySignatureBase(
        FIXED_SET_SIGNATURE_BASE,
        signatureBytes(signed.Signature),
        publicKey,
      ),
    ).resolves.toBe(true);
  });

  it.each([
    ['RFC 9530 B.1', HELLO_WORLD_BODY, HELLO_WORLD_DIGEST],
    ['the empty body', '', EMPTY_DIGEST],
  ])('digests %s as RFC 9530 does', (_name, body, digest) => {
    expect(contentDigest(bytes(body))).toBe(digest);
  });
});

describe('a signed request', () => {
  const NOW = 1_800_000_000_000;
  const created = NOW / 1000;
  const url = 'https://app.walkeros.io/api/runner/check-in';
  const body = '{"release":"r1"}';

  interface Check {
    url: string;
    headers: Headers;
    body: Uint8Array;
    key: PublicEcJwk | ((keyid: string) => Promise<PublicEcJwk | undefined>);
    tag: string;
    now: number;
  }

  async function signed(key: PrivateEcJwk = signingKey): Promise<Check> {
    const headers = await signRequest({
      method: 'POST',
      url,
      body: bytes(body),
      key,
      tag: 'walkeros-app',
      created,
      nonce: 'n0nce-1',
    });
    return {
      url,
      headers: new Headers(headers),
      body: bytes(body),
      key: publicKey,
      tag: 'walkeros-app',
      now: NOW,
    };
  }

  const verify = (check: Check) =>
    verifyRequestSignature({ method: 'POST', ...check });

  /** The same check with one header's value rewritten. */
  function rewrite(
    check: Check,
    name: string,
    change: (value: string) => string,
  ): Check {
    const headers = new Headers(check.headers);
    headers.set(name, change(headers.get(name) || ''));
    return { ...check, headers };
  }

  it.each<[string, (check: Check) => Check]>([
    ['a static key', (check) => check],
    [
      'a key looked up by keyid',
      (check) => ({
        ...check,
        key: async (keyid) =>
          keyid === TEST_KEY_THUMBPRINT ? publicKey : undefined,
      }),
    ],
    ['created 60 seconds old', (check) => ({ ...check, now: NOW + 60_000 })],
  ])('verifies its own signature with %s', async (_name, change) => {
    await expect(verify(change(await signed()))).resolves.toEqual({
      ok: true,
      keyid: TEST_KEY_THUMBPRINT,
      nonce: 'n0nce-1',
      created,
    });
  });

  type Change = (
    check: Check,
    sign: (key: PrivateEcJwk) => Promise<Check>,
  ) => Check | Promise<Check>;

  it.each<[string, Change, SignatureRefusal]>([
    ['another tag', (check) => ({ ...check, tag: 'walkeros-ingest' }), 'tag'],
    [
      'an alg unlike the key',
      (check) =>
        rewrite(check, 'signature-input', (value) =>
          value.replace('ecdsa-p256-sha256', 'ecdsa-p384-sha384'),
        ),
      'alg',
    ],
    [
      'created 61 seconds old',
      (check) => ({ ...check, now: NOW + 61_000 }),
      'created',
    ],
    [
      'created 61 seconds ahead',
      (check) => ({ ...check, now: NOW - 61_000 }),
      'created',
    ],
    [
      'a body changed under its digest',
      (check) => ({ ...check, body: bytes('{"release":"r2"}') }),
      'digest',
    ],
    [
      'a component missing',
      (check) =>
        rewrite(check, 'signature-input', (value) =>
          value.replace(' "content-digest"', ''),
        ),
      'components',
    ],
    [
      'a component extra',
      (check) =>
        rewrite(check, 'signature-input', (value) =>
          value.replace(
            '"content-digest")',
            '"content-digest" "content-type")',
          ),
        ),
      'components',
    ],
    [
      'no nonce',
      (check) =>
        rewrite(check, 'signature-input', (value) =>
          value.replace(';nonce="n0nce-1"', ''),
        ),
      'params',
    ],
    [
      'a label other than sig1',
      (check) =>
        rewrite(
          rewrite(check, 'signature-input', (value) =>
            value.replace('sig1=', 'sig2='),
          ),
          'signature',
          (value) => value.replace('sig1=', 'sig2='),
        ),
      'label',
    ],
    [
      'a Signature-Input carrying two signatures',
      (check) =>
        rewrite(
          check,
          'signature-input',
          (value) => `${value}, sig2=${value.slice('sig1='.length)}`,
        ),
      'label',
    ],
    [
      'a keyid the lookup has no key for',
      (check) => ({ ...check, key: async () => undefined }),
      'unknown-key',
    ],
    [
      "a keyid unlike the key's thumbprint",
      (_check, sign) =>
        sign({
          ...signingKey,
          kid: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        }),
      'keyid',
    ],
    [
      'another target URI',
      (check) => ({ ...check, url: `${url}?deployment=dep_other` }),
      'signature',
    ],
  ])('refuses %s', async (_name, change, reason) => {
    await expect(verify(await change(await signed(), signed))).resolves.toEqual(
      { ok: false, reason },
    );
  });
});
