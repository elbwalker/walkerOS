import { randomBytes, webcrypto } from 'node:crypto';
import type { PrivateEcJwk, PublicEcJwk } from '@walkeros/core';

/**
 * ES256, ECDSA P-256 with SHA-256, for every signature a service credential
 * makes: compact JWS (RFC 7515, RFC 7518 section 3.4) and HTTP message
 * signatures (RFC 9421 section 3.3.4). WebCrypto's ECDSA answers IEEE P1363
 * `r||s`, the 64 bytes both specifications take.
 */

const ECDSA_P256 = { name: 'ECDSA', namedCurve: 'P-256' };
const ECDSA_SHA256 = { name: 'ECDSA', hash: 'SHA-256' };

/** base64url without padding (RFC 7515 section 2); a string is taken as UTF-8. */
export function base64url(data: Uint8Array | string): string {
  return Buffer.from(data).toString('base64url');
}

/** The bytes of an ASCII text, on an ArrayBuffer of their own as WebCrypto takes them. */
export function ascii(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(text, 'latin1'));
}

/** 128 bits from the platform's CSPRNG, base64url: a `jti` or a nonce. */
export function randomId(): string {
  return base64url(randomBytes(16));
}

const signingKeys = new WeakMap<PrivateEcJwk, Promise<webcrypto.CryptoKey>>();

/** The private key as a non-extractable WebCrypto key, imported once per JWK. */
function signingKey(jwk: PrivateEcJwk): Promise<webcrypto.CryptoKey> {
  let key = signingKeys.get(jwk);
  if (!key) {
    const { kty, crv, x, y, d } = jwk;
    key = webcrypto.subtle.importKey(
      'jwk',
      { kty, crv, x, y, d },
      ECDSA_P256,
      false,
      ['sign'],
    );
    signingKeys.set(jwk, key);
  }
  return key;
}

/** Signs `data` with ES256: 64 bytes, `r||s`. */
export async function es256Sign(
  jwk: PrivateEcJwk,
  data: Uint8Array,
): Promise<Uint8Array> {
  const signature = await webcrypto.subtle.sign(
    ECDSA_SHA256,
    await signingKey(jwk),
    new Uint8Array(data),
  );
  return new Uint8Array(signature);
}

/** Verifies an ES256 `r||s` signature over `data`. */
export async function es256Verify(
  jwk: PublicEcJwk,
  data: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  if (signature.byteLength !== 64) return false;
  const { kty, crv, x, y } = jwk;
  const key = await webcrypto.subtle.importKey(
    'jwk',
    { kty, crv, x, y },
    ECDSA_P256,
    false,
    ['verify'],
  );
  return webcrypto.subtle.verify(
    ECDSA_SHA256,
    key,
    new Uint8Array(signature),
    new Uint8Array(data),
  );
}

/**
 * The JWS signing input (RFC 7515 section 5.1): the base64url of the
 * header's and the payload's exact octets, joined by a period.
 */
export function signingInput(header: string, payload: string): string {
  return `${base64url(header)}.${base64url(payload)}`;
}

/** A compact JWS (RFC 7515 section 7.1) of a JSON header and payload, signed ES256. */
export async function compactJws(
  header: Readonly<Record<string, unknown>> & { alg?: never },
  payload: Readonly<Record<string, unknown>>,
  key: PrivateEcJwk,
): Promise<string> {
  const input = signingInput(
    JSON.stringify({ alg: 'ES256', ...header }),
    JSON.stringify(payload),
  );
  return `${input}.${base64url(await es256Sign(key, ascii(input)))}`;
}
