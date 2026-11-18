import { createHash } from 'node:crypto';
import type { PrivateEcJwk } from '@walkeros/core';
import { compactJws, randomId } from './jws';

/**
 * A DPoP proof (RFC 9449 section 4.2) for one request, signed with the
 * credential's signing key; its header carries only the key's public members.
 * With `accessToken` it binds the token (`ath`), with `nonce` it answers the
 * server's last `DPoP-Nonce`.
 */
export async function dpopProof(input: {
  key: PrivateEcJwk;
  method: string;
  url: string;
  accessToken?: string;
  nonce?: string;
  /** ms since the epoch, as `Date.now()`. */
  now?: number;
}): Promise<string> {
  const target = new URL(input.url);
  const { kty, crv, x, y } = input.key;
  const claims: Record<string, string | number> = {
    jti: randomId(),
    htm: input.method,
    // RFC 9449 section 4.2: the target URI without query and fragment.
    htu: `${target.origin}${target.pathname}`,
    iat: Math.floor((input.now ?? Date.now()) / 1000),
  };
  if (input.accessToken !== undefined)
    claims.ath = createHash('sha256')
      .update(input.accessToken, 'ascii')
      .digest('base64url');
  if (input.nonce !== undefined) claims.nonce = input.nonce;
  return compactJws(
    { typ: 'dpop+jwt', jwk: { kty, crv, x, y } },
    claims,
    input.key,
  );
}
