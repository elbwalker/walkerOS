import { createHash } from 'crypto';
import { http, HttpResponse, type HttpHandler } from 'msw';
import {
  encodeServiceCredential,
  type PrivateEcJwk,
  type ServiceTargetKind,
} from '@walkeros/core';

export const SERVICE_ISSUER = 'https://auth.service.test';
export const SERVICE_APP = 'https://app.service.test';
const TOKEN_URL = `${SERVICE_ISSUER}/api/services/token`;

/** RFC 7638: the SHA-256 of the required members in order, base64url. */
function thumbprint(x: string, y: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ crv: 'P-256', kty: 'EC', x, y }))
    .digest('base64url');
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
    kid: thumbprint(x, y),
    use,
    alg: use === 'sig' ? 'ES256' : 'ECDH-ES',
  };
}

/**
 * A `wos_cred_` string with fresh keys, for the stub auth server below, or
 * for the issuer and app origins given.
 */
export async function testCredential(
  kind: ServiceTargetKind = 'automation',
  origins: { issuer: string; app: string } = {
    issuer: SERVICE_ISSUER,
    app: SERVICE_APP,
  },
): Promise<string> {
  return encodeServiceCredential({
    v: 1,
    iss: origins.issuer,
    resource: `${origins.app}/api`,
    client_id: 'crd_testautomation00000000',
    target: { kind, id: 'acc_test1' },
    sig: await privateKey('sig'),
    enc: await privateKey('enc'),
  });
}

/** One request the stub token endpoint got: its DPoP proof, if any. */
export interface TokenRequest {
  dpop: string | null;
}

/**
 * The stub auth server: its RFC 8414 document and its token endpoint, which
 * answers a bound request with a DPoP token, and an unbound one with a bearer
 * for an automation and the refusal for any other kind, as the auth server
 * does.
 */
export function serviceAuthServer(kind: ServiceTargetKind = 'automation'): {
  handlers: HttpHandler[];
  tokenRequests: TokenRequest[];
} {
  const tokenRequests: TokenRequest[] = [];
  let issued = 0;
  const handlers = [
    http.get(`${SERVICE_ISSUER}/.well-known/oauth-authorization-server`, () =>
      HttpResponse.json({
        issuer: SERVICE_ISSUER,
        service_token_endpoint: TOKEN_URL,
        dpop_signing_alg_values_supported: ['ES256'],
      }),
    ),
    http.post(TOKEN_URL, ({ request }) => {
      const dpop = request.headers.get('dpop');
      tokenRequests.push({ dpop });
      if (dpop === null && kind !== 'automation')
        return HttpResponse.json(
          {
            error: 'invalid_request',
            error_description: 'This credential buys bound tokens only',
          },
          { status: 400 },
        );
      issued += 1;
      return HttpResponse.json({
        access_token: dpop === null ? `bearer-${issued}` : `tok-${issued}`,
        token_type: dpop === null ? 'Bearer' : 'DPoP',
        expires_in: dpop === null ? 3600 : 86400,
        scope: 'read write',
      });
    }),
  ];
  return { handlers, tokenRequests };
}

/** The claims of a compact JWS, read without checking it. */
export function jwtClaims(jwt: string): Record<string, unknown> {
  const payload = jwt.split('.')[1] ?? '';
  const claims: Record<string, unknown> = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf-8'),
  );
  return claims;
}
