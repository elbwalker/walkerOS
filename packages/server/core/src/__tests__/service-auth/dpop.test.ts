import { createHash } from 'node:crypto';
import type { PrivateEcJwk } from '@walkeros/core';
import { dpopProof } from '../../service-auth/dpop';
import { es256Verify } from '../../service-auth/jws';
import { decodeJws, embeddedJwk } from './jws-vectors';
import { TEST_KEY_ECC_P256, TEST_KEY_THUMBPRINT } from './rfc9421-vectors';

const { kty, crv, x, y, d } = TEST_KEY_ECC_P256;
const key: PrivateEcJwk = {
  kty,
  crv,
  x,
  y,
  d,
  kid: TEST_KEY_THUMBPRINT,
  use: 'sig',
  alg: 'ES256',
};
const NOW = 1_800_000_000_000;
const URL_WITH_QUERY = 'https://app.walkeros.io/api/runner/check-in?probe=1#x';

describe('DPoP proof', () => {
  it('carries its type, the public key only, the method and the URL without query, signed by that key', async () => {
    const proof = decodeJws(
      await dpopProof({ key, method: 'POST', url: URL_WITH_QUERY, now: NOW }),
    );
    expect(proof.header).toEqual({
      alg: 'ES256',
      typ: 'dpop+jwt',
      jwk: { kty, crv, x, y },
    });
    expect(proof.payload).toEqual({
      jti: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
      htm: 'POST',
      htu: 'https://app.walkeros.io/api/runner/check-in',
      iat: NOW / 1000,
    });
    await expect(
      es256Verify(
        embeddedJwk(proof.header),
        proof.signingInput,
        proof.signature,
      ),
    ).resolves.toBe(true);
  });

  it.each([
    [
      'ath for a token',
      { accessToken: 'eyJ.token.value' },
      {
        ath: createHash('sha256').update('eyJ.token.value').digest('base64url'),
      },
    ],
    ['nonce when given', { nonce: 'n-1' }, { nonce: 'n-1' }],
  ])('carries %s', async (_name, extra, claims) => {
    const proof = await dpopProof({
      key,
      method: 'GET',
      url: URL_WITH_QUERY,
      now: NOW,
      ...extra,
    });
    expect(decodeJws(proof).payload).toMatchObject(claims);
  });
});
