import type {
  Authorize,
  PrivateEcJwk,
  ServiceCredential,
} from '@walkeros/core';
import { isLocalHost } from '@walkeros/core';
import { APP_SIGNATURE_TAG } from './client';
import { contentDigest, signContentDigest } from './signature';

/** The `tag` of a signature names the door it is good for (RFC 9421 section 2.3). */
export const SIGNATURE_TAGS = {
  app: APP_SIGNATURE_TAG,
  ingest: 'walkeros-ingest',
  read: 'walkeros-read',
} as const;

/** The tags of the data plane's doors; the app's tag is never one. */
export type DoorTag = typeof SIGNATURE_TAGS.ingest | typeof SIGNATURE_TAGS.read;

/** The form `contentDigest` writes: sha-256 of the body, base64, as RFC 9530 section 2. */
const SHA256_DIGEST = /^sha-256=:[A-Za-z0-9+/]{43}=:$/;

/**
 * Signs one request at a door from its `Content-Digest`, so a signer that
 * holds the key but not the body (a supervisor signing for its child) signs
 * the same request a body signer does.
 */
export async function signDoorRequest(input: {
  method: string;
  url: string;
  contentDigest: string;
  key: PrivateEcJwk;
  tag: DoorTag;
  /** UNIX seconds; now when left out. */
  created?: number;
  nonce?: string;
}): Promise<{ 'Signature-Input': string; Signature: string }> {
  // A digest of another form could add lines to the signature base.
  if (!SHA256_DIGEST.test(input.contentDigest))
    throw new Error('The content digest is not a sha-256 Content-Digest');
  return signContentDigest(input);
}

/**
 * The door signer's rule: POST only, to https or http on a loopback or
 * private host, never to the credential's resource or issuer origin, so a
 * step never obtains headers the app takes. No list of door origins is kept:
 * a runner that starts while the auth server is down still signs its ingest
 * writes. Throws the fact.
 */
export function assertDoorTarget(
  request: { method: string; url: string },
  credential: Pick<ServiceCredential, 'resource' | 'iss'>,
): void {
  if (request.method !== 'POST')
    throw new Error('The door signer signs POST requests only');
  const target = new URL(request.url);
  const local = target.protocol === 'http:' && isLocalHost(target.hostname);
  if (target.protocol !== 'https:' && !local)
    throw new Error(
      'The door signer signs https, or http to a loopback or private host, only',
    );
  if (
    target.origin === new URL(credential.resource).origin ||
    target.origin === new URL(credential.iss).origin
  )
    throw new Error(
      'The door signer does not sign for the app or its auth server',
    );
}

/**
 * The `Authorize` a runner hands its steps: every call signs anew (a fresh
 * nonce and `created`, so a retry is a new signature) with the credential's
 * signing key and the ingest tag, over the exact body bytes, for the requests
 * `assertDoorTarget` takes.
 */
export function createDoorAuthorize(
  credential: ServiceCredential,
  options: { now?: () => number } = {},
): Authorize {
  const now = options.now ?? Date.now;

  return async ({ method, url, body }) => {
    assertDoorTarget({ method, url }, credential);
    const digest = contentDigest(body ?? new Uint8Array(0));
    const signed = await signDoorRequest({
      method,
      url,
      contentDigest: digest,
      key: credential.sig,
      tag: SIGNATURE_TAGS.ingest,
      created: Math.floor(now() / 1000),
    });
    return { ...signed, 'Content-Digest': digest };
  };
}
