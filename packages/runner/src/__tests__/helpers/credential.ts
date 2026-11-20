import { createHash } from 'crypto';
import {
  encodeServiceCredential,
  type PrivateEcJwk,
  type ServiceCredential,
  type ServiceTargetKind,
} from '@walkeros/core';

export const TEST_ISSUER = 'https://auth.example.test';
export const TEST_APP = 'https://app.example.test';
export const TEST_DEPLOYMENT = 'dep_test1';
/** An issuer on a closed port: the client buys no token and signs its requests. */
export const CLOSED_ISSUER = 'http://127.0.0.1:9';

/** RFC 7638: the SHA-256 of the required members in order, base64url. */
function thumbprint(jwk: { crv: string; kty: string; x: string; y: string }) {
  const members = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });
  return createHash('sha256').update(members).digest('base64url');
}

async function privateKey(use: 'sig' | 'enc'): Promise<PrivateEcJwk> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const { x, y, d } = await crypto.subtle.exportKey('jwk', pair.privateKey);
  if (!x || !y || !d) throw new Error('the generated key has no x, y or d');
  return {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d,
    kid: thumbprint({ crv: 'P-256', kty: 'EC', x, y }),
    use,
    alg: use === 'sig' ? 'ES256' : 'ECDH-ES',
  };
}

/**
 * A credential with fresh keys, as the auth server makes one, and its string.
 * A run against the stand-in app sets `resource` to `<its origin>/api` and
 * `iss` to {@link CLOSED_ISSUER}.
 */
export async function testCredential(
  kind: ServiceTargetKind = 'deployment',
  options: { resource?: string; iss?: string; id?: string } = {},
): Promise<{ credential: ServiceCredential; raw: string }> {
  const credential: ServiceCredential = {
    v: 1,
    iss: options.iss ?? TEST_ISSUER,
    resource: options.resource ?? `${TEST_APP}/api`,
    client_id: 'crd_testclient000000000000',
    target: { kind, id: options.id ?? TEST_DEPLOYMENT },
    sig: await privateKey('sig'),
    enc: await privateKey('enc'),
  };
  return { credential, raw: encodeServiceCredential(credential) };
}
