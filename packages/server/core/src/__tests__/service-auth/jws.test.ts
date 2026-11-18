import type { PublicEcJwk } from '@walkeros/core';
import { ascii, es256Verify, signingInput } from '../../service-auth/jws';
import { jwkThumbprint } from '../../service-auth/signature';
import {
  A3_HEADER,
  A3_KEY,
  A3_PAYLOAD,
  A3_SIGNATURE,
  A3_SIGNING_INPUT,
  RFC9449_JKT,
  RFC9449_PROOF,
  decodeJws,
  embeddedJwk,
} from './jws-vectors';

const { kty, crv, x, y } = A3_KEY;
const a3PublicKey: PublicEcJwk = { kty, crv, x, y };
const a3Signature = new Uint8Array(Buffer.from(A3_SIGNATURE, 'base64url'));
const proof = decodeJws(RFC9449_PROOF);

describe('ES256 compact JWS', () => {
  it("encodes RFC 7515 A.3's header and payload to its signing input byte for byte", () => {
    expect(signingInput(A3_HEADER, A3_PAYLOAD)).toBe(A3_SIGNING_INPUT);
  });

  it.each<[string, () => Promise<boolean>, boolean]>([
    [
      "RFC 7515 A.3's published signature over its signing input",
      () => es256Verify(a3PublicKey, ascii(A3_SIGNING_INPUT), a3Signature),
      true,
    ],
    [
      "RFC 7515 A.3's signature over a changed signing input",
      () =>
        es256Verify(
          a3PublicKey,
          ascii(A3_SIGNING_INPUT.replace('eyJpc3Mi', 'eyJpc3Ni')),
          a3Signature,
        ),
      false,
    ],
    [
      "RFC 9449's example proof with its embedded JWK",
      () =>
        es256Verify(
          embeddedJwk(proof.header),
          proof.signingInput,
          proof.signature,
        ),
      true,
    ],
    [
      "RFC 9449's example proof with another key",
      () => es256Verify(a3PublicKey, proof.signingInput, proof.signature),
      false,
    ],
  ])('verifies %s as the RFC says', async (_name, verify, valid) => {
    await expect(verify()).resolves.toBe(valid);
  });

  it("takes RFC 9449's jkt as the RFC 7638 thumbprint of its example key", () => {
    expect(jwkThumbprint(embeddedJwk(proof.header))).toBe(RFC9449_JKT);
  });
});
