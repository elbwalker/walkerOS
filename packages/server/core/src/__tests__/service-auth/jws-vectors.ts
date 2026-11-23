import type { PublicEcJwk } from '@walkeros/core';

/**
 * JWS test vectors, byte for byte from the RFCs, with their line breaks for
 * display (RFC 7515) and RFC 8792 '\' wrapping (RFC 9449) undone.
 */

/** RFC 7515 Appendix A.3.1: the JWS Protected Header. */
export const A3_HEADER = '{"alg":"ES256"}';

/** RFC 7515 Appendix A.3.1 (the payload of A.1.1): CRLF line breaks, one leading space. */
export const A3_PAYLOAD =
  '{"iss":"joe",\r\n "exp":1300819380,\r\n "http://example.com/is_root":true}';

/** RFC 7515 Appendix A.3.1: the JWS Signing Input. */
export const A3_SIGNING_INPUT =
  'eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ';

/** RFC 7515 Appendix A.3.1: BASE64URL(JWS Signature), R || S. */
export const A3_SIGNATURE =
  'DtEhU3ljbEg8L38VWAfUAqOyKAM6-Xx-F4GawxaepmXFCgfTjDxw5djxLa8ISlSApmWQxfKTUJqPP3-Kg6NU1Q';

/** RFC 7515 Appendix A.3.1: the Elliptic Curve key. */
export const A3_KEY = {
  kty: 'EC',
  crv: 'P-256',
  x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
  y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
  d: 'jpsQnnGQmL-YBIffH1136cspYG6-0iY7X1fCE9-E9LI',
} as const;

/** RFC 9449 section 4.1, Figure 2: the example DPoP proof. */
export const RFC9449_PROOF =
  'eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwieCI6Imw4dEZyaHgtMzR0VjNoUklDUkRZOXpDa0RscEJoRjQyVVFVZldWQVdCRnMiLCJ5IjoiOVZFNGpmX09rX282NHpiVFRsY3VOSmFqSG10NnY5VERWclUwQ2R2R1JEQSIsImNydiI6IlAtMjU2In19.eyJqdGkiOiItQndDM0VTYzZhY2MybFRjIiwiaHRtIjoiUE9TVCIsImh0dSI6Imh0dHBzOi8vc2VydmVyLmV4YW1wbGUuY29tL3Rva2VuIiwiaWF0IjoxNTYyMjYyNjE2fQ.2-GxA6T8lP4vfrg8v-FdWP0A0zdrj8igiMLvqRMUvwnQg4PtFLbdLXiOSsX0x7NVY-FNyJK70nfbV37xRZT3Lg';

/** RFC 9449 section 6.1, Figure 9: the `jkt` of the example proofs' public key (RFC 7638). */
export const RFC9449_JKT = '0ZcOCORZNYy-DWpqq30jZyJGHTN0d2HglBV3uiguA4I';

/** A compact JWS split for a test: its decoded header and payload, its signing input and signature bytes. */
export function decodeJws(jws: string): {
  header: unknown;
  payload: unknown;
  signingInput: Uint8Array;
  signature: Uint8Array;
} {
  const [header, payload, signature] = jws.split('.');
  const json = (part: string): unknown =>
    JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  return {
    header: json(header),
    payload: json(payload),
    signingInput: new Uint8Array(Buffer.from(`${header}.${payload}`, 'ascii')),
    signature: new Uint8Array(Buffer.from(signature, 'base64url')),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The public P-256 key a decoded JWS header carries in `jwk`. */
export function embeddedJwk(header: unknown): PublicEcJwk {
  if (!isRecord(header) || !isRecord(header.jwk))
    throw new Error('The header carries no jwk');
  const { kty, crv, x, y } = header.jwk;
  if (
    kty !== 'EC' ||
    crv !== 'P-256' ||
    typeof x !== 'string' ||
    typeof y !== 'string'
  )
    throw new Error('The header jwk is no P-256 key');
  return { kty, crv, x, y };
}
