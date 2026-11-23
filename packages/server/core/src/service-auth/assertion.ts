import type { ServiceCredential } from '@walkeros/core';
import { compactJws, randomId } from './jws';

/** How far ahead an assertion expires; the auth server takes at most 60 s. */
export const ASSERTION_LIFETIME_SECONDS = 30;

/**
 * The client assertion of a token request (RFC 7523 section 3, RFC 10070
 * section 4): typed `client-authentication+jwt`, `kid` the signing key's
 * thumbprint, `iss` and `sub` the client id, `aud` the issuer as a string,
 * a fresh `jti`, `exp` 30 seconds ahead.
 */
export async function clientAssertion(input: {
  credential: ServiceCredential;
  /** ms since the epoch, as `Date.now()`. */
  now?: number;
}): Promise<string> {
  const { credential } = input;
  const iat = Math.floor((input.now ?? Date.now()) / 1000);
  return compactJws(
    { typ: 'client-authentication+jwt', kid: credential.sig.kid },
    {
      iss: credential.client_id,
      sub: credential.client_id,
      aud: credential.iss,
      iat,
      exp: iat + ASSERTION_LIFETIME_SECONDS,
      jti: randomId(),
    },
    credential.sig,
  );
}
