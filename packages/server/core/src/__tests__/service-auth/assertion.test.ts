import { clientAssertion } from '../../service-auth/assertion';
import { es256Verify } from '../../service-auth/jws';
import { decodeJws } from './jws-vectors';
import {
  TEST_KEY_ECC_P256,
  TEST_KEY_THUMBPRINT,
  testCredential,
} from './rfc9421-vectors';

const { kty, crv, x, y } = TEST_KEY_ECC_P256;
const credential = testCredential();

const NOW = 1_800_000_000_000;

describe('client assertion', () => {
  it('carries the header and claims the token endpoint checks, signed by the key', async () => {
    const assertion = decodeJws(
      await clientAssertion({ credential, now: NOW }),
    );
    expect(assertion.header).toEqual({
      alg: 'ES256',
      typ: 'client-authentication+jwt',
      kid: TEST_KEY_THUMBPRINT,
    });
    expect(assertion.payload).toEqual({
      iss: credential.client_id,
      sub: credential.client_id,
      aud: 'https://auth.walkeros.io',
      iat: NOW / 1000,
      exp: NOW / 1000 + 30,
      jti: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
    });
    await expect(
      es256Verify(
        { kty, crv, x, y },
        assertion.signingInput,
        assertion.signature,
      ),
    ).resolves.toBe(true);
  });

  it('takes a fresh jti each time', async () => {
    const first = decodeJws(await clientAssertion({ credential, now: NOW }));
    const second = decodeJws(await clientAssertion({ credential, now: NOW }));
    expect(first.payload).not.toEqual(second.payload);
  });
});
