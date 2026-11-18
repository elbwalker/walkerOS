import type { ServiceAuthMetadata } from '@walkeros/core';
import { networkErrorMessage, parseServiceAuthMetadata } from '@walkeros/core';

const WELL_KNOWN = '/.well-known/oauth-authorization-server';

/** RFC 8414 section 3.1: the well-known path goes between the host and any path of the issuer. */
export function metadataUrl(issuer: string): string {
  const url = new URL(issuer);
  const path = url.pathname === '/' ? '' : url.pathname;
  return `${url.origin}${WELL_KNOWN}${path}`;
}

/**
 * The auth server's metadata for a credential holder, checked before any
 * token request: the `issuer` byte for byte (RFC 8414 section 3.3), the
 * service token endpoint on the issuer's origin, and ES256 among the DPoP
 * proof algorithms. Each failure throws its fact.
 */
export async function discoverIssuer(
  iss: string,
  options: { fetch?: typeof fetch } = {},
): Promise<ServiceAuthMetadata> {
  // Read at call time, so a replaced global fetch is the one used.
  const fetchImpl = options.fetch || globalThis.fetch;
  let response: Response;
  try {
    response = await fetchImpl(metadataUrl(iss), {
      headers: { Accept: 'application/json' },
      redirect: 'manual',
    });
  } catch (error) {
    throw new Error(
      `The auth server's metadata could not be read: ${networkErrorMessage(error)}`,
    );
  }
  if (response.status !== 200)
    throw new Error(
      `The auth server's metadata answered HTTP ${response.status}`,
    );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The auth server's metadata is not JSON");
  }
  const metadata = parseServiceAuthMetadata(body);
  if (!metadata)
    throw new Error(
      "The auth server's metadata names no service token endpoint",
    );
  if (metadata.issuer !== iss)
    throw new Error(
      "The auth server's metadata names another issuer than the credential",
    );
  let endpoint: URL;
  try {
    endpoint = new URL(metadata.service_token_endpoint);
  } catch {
    throw new Error("The auth server's service token endpoint is not a URL");
  }
  if (endpoint.origin !== new URL(iss).origin)
    throw new Error(
      "The auth server's service token endpoint is off the issuer's origin",
    );
  if (!metadata.dpop_signing_alg_values_supported.includes('ES256'))
    throw new Error('The auth server takes no ES256 DPoP proofs');
  return metadata;
}
