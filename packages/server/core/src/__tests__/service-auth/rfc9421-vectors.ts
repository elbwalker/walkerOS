import type { ServiceCredential, ServiceTargetKind } from '@walkeros/core';

/**
 * Test vectors, byte for byte from the RFCs. RFC 8792 line wrapping in the
 * RFC text ('\' at a line end, the next line's leading spaces dropped) is
 * undone here.
 */

/** RFC 9421 Appendix B.1.3, test-key-ecc-p256, in its JWK form. */
export const TEST_KEY_ECC_P256 = {
  kty: 'EC',
  crv: 'P-256',
  kid: 'test-key-ecc-p256',
  d: 'UpuF81l-kOxbjf7T4mNSv0r5tN67Gim7rnf6EFpcYDs',
  x: 'qIVYZVLCrPZHGHjP17CTW0_-D9Lfw0EkjqF7xB4FivA',
  y: 'Mc4nN9LTDOBhfoUeg8Ye9WedFRhnZXZJA12Qp0zZ6F0',
} as const;

/** RFC 9421 Appendix B.2.4: the signature base of the response signed with ecdsa-p256-sha256. */
export const B24_SIGNATURE_BASE = [
  '"@status": 200',
  '"content-type": application/json',
  '"content-digest": sha-512=:mEWXIS7MaLRuGgxOBdODa3xqM1XdEvxoYhvlCFJ41QJgJc4GTsPp29l5oGX69wWdXymyU0rjJuahq4l5aGgfLQ==:',
  '"content-length": 23',
  '"@signature-params": ("@status" "content-type" "content-digest" "content-length");created=1618884473;keyid="test-key-ecc-p256"',
].join('\n');

/** RFC 9421 Appendix B.2.4: the published Signature value of sig-b24 (r||s, base64). */
export const B24_SIGNATURE =
  'wNmSUAhwb5LxtOtOpNa6W5xj067m5hFrj0XQ4fvpaCLx0NKocgPquLgyahnzDnDAUy5eCdlYUEkLIj+32oiasw==';

/** RFC 9530 Appendix B.1: `{"hello": "world"}` and a line feed. */
export const HELLO_WORLD_BODY = '{"hello": "world"}\n';
export const HELLO_WORLD_DIGEST =
  'sha-256=:RK/0qy18MlBSVnWgjwz6lZEWjP/lF5HF9bvEF8FabDg=:';

/** RFC 9530 Appendix B.2: the empty content. */
export const EMPTY_DIGEST =
  'sha-256=:47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=:';

/** The RFC 7638 thumbprint of test-key-ecc-p256. */
export const TEST_KEY_THUMBPRINT =
  'ydQXMtvbsOsZyFir-Y7A8t7fKEM1gbKPvyFkdpu4fvI';

/**
 * Our fixed component set for one request, built by hand from RFC 9421
 * sections 2.2.1 (`@method`), 2.2.2 (`@target-uri` with its query), 2.1
 * (`content-digest`), 2.3 (`@signature-params`) and 2.5 (the lines, no final
 * newline).
 */
export const FIXED_SET_REQUEST = {
  method: 'POST',
  url: 'https://app.walkeros.io/api/runner/check-in?probe=1',
  body: HELLO_WORLD_BODY,
  created: 1618884473,
  nonce: 'b3k2pp5k7z-50gnwp.yemd',
  tag: 'walkeros-app',
} as const;

export const FIXED_SET_SIGNATURE_BASE = [
  '"@method": POST',
  '"@target-uri": https://app.walkeros.io/api/runner/check-in?probe=1',
  `"content-digest": ${HELLO_WORLD_DIGEST}`,
  `"@signature-params": ("@method" "@target-uri" "content-digest");created=1618884473;nonce="b3k2pp5k7z-50gnwp.yemd";keyid="${TEST_KEY_THUMBPRINT}";alg="ecdsa-p256-sha256";tag="walkeros-app"`,
].join('\n');

/** A credential of `kind` whose two keys are test-key-ecc-p256. */
export function testCredential(
  kind: ServiceTargetKind = 'deployment',
): ServiceCredential {
  const { kty, crv, x, y, d } = TEST_KEY_ECC_P256;
  const key = { kty, crv, x, y, d, kid: TEST_KEY_THUMBPRINT };
  return {
    v: 1,
    iss: 'https://auth.walkeros.io',
    resource: 'https://app.walkeros.io/api',
    client_id: 'crd_0123456789abcdefghijklmn',
    target: {
      kind,
      id:
        kind === 'automation'
          ? 'user_0123456789abcdefghijk'
          : 'dep_0123456789abcdefghijk',
    },
    sig: { ...key, use: 'sig', alg: 'ES256' },
    enc: { ...key, use: 'enc', alg: 'ECDH-ES' },
  };
}
