import { createServiceAuth } from '../../service-auth/client';
import { testCredential } from './rfc9421-vectors';

const METADATA = {
  issuer: 'https://auth.walkeros.io',
  service_token_endpoint: 'https://auth.walkeros.io/api/services/token',
  dpop_signing_alg_values_supported: ['ES256'],
};

describe('discovery', () => {
  it.each([
    [
      'another issuer',
      { ...METADATA, issuer: 'https://auth.stage.walkeros.io' },
      "The auth server's metadata names another issuer than the credential",
    ],
    [
      "an endpoint off the issuer's origin",
      {
        ...METADATA,
        service_token_endpoint: 'https://tokens.example/api/services/token',
      },
      "The auth server's service token endpoint is off the issuer's origin",
    ],
    [
      'no ES256 among the DPoP algorithms',
      { ...METADATA, dpop_signing_alg_values_supported: ['RS256'] },
      'The auth server takes no ES256 DPoP proofs',
    ],
  ])('refuses %s before any token request', async (_name, metadata, fact) => {
    const requested: string[] = [];
    const auth = createServiceAuth(testCredential(), {
      fetch: async (input) => {
        requested.push(String(input));
        return Response.json(metadata);
      },
      logger: { error: () => undefined },
    });
    await expect(auth.token()).rejects.toThrow(fact);
    expect(requested).toEqual([
      'https://auth.walkeros.io/.well-known/oauth-authorization-server',
    ]);
  });
});
