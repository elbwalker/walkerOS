/**
 * The one way `runneros remote` reaches the app: its deployment's service
 * credential in `WALKEROS_CREDENTIAL`, read once. The credential names the
 * app's origin, the runner's deployment and the key the app seals the
 * release's secret values to; its client signs or buys tokens for each
 * request and hears every answer. The supervisor uses only what this
 * returns, so the credential itself never reaches it, a child or a line.
 */

import type { Authorize, Logger } from '@walkeros/core';
import type { KnownValues } from '@walkeros/core/node';
import {
  appAnswerOf,
  assertDoorTarget,
  createServiceAuth,
  jwkThumbprint,
  openSealedSecretSet,
  SERVICE_CREDENTIAL_ENV,
  SIGNATURE_TAGS,
  signDoorRequest,
  type ServiceAuthOptions,
} from '@walkeros/server-core';
import { readRunnerCredential } from '../credentials.js';
import { messageOf } from './errors.js';
import { ReleaseRefusal } from './release-document.js';

export interface AppLink {
  /** The app's origin. Every request goes there, and to no other host but the archive's one redirect, sent without credentials. */
  readonly origin: string;
  /** The runner's own deployment: the document check and the high-water mark use it. */
  readonly deploymentId: string;
  /** The credential's encryption key's RFC 7638 thumbprint: the cache folder of its sealed sets. */
  readonly keyId: string;
  /** The headers one request needs. */
  readonly authorize: Authorize;
  /** How the app answered a request `authorize` gave headers for. */
  answered(answer: { status: number; headers?: Headers }): void;
  /** Opens a release's sealed set; throws ReleaseRefusal 'secret-set'. */
  readSecretSet(
    bytes: Uint8Array,
    expect: { deployment: string; sequence: number },
  ): Promise<Record<string, string>>;
  /** Signs one ingest write of the child's steps under the door signer's rule; throws the fact. */
  signStep(request: {
    method: string;
    url: string;
    contentDigest: string;
  }): Promise<{ 'Signature-Input': string; Signature: string }>;
  /** Stops what the link runs. */
  close(): void;
}

/**
 * Read the credential once and remove it from `env`, so no child inherits
 * it; its string joins `knownValues` first, so no line shows it. Only a
 * deployment's credential links a runner: each other case throws its fact,
 * naming the variable, never the value.
 */
export function appLinkFromEnvironment(options: {
  env: NodeJS.ProcessEnv;
  logger: Logger.Instance;
  knownValues: KnownValues;
  /** For tests: the client's fetch, clock and jitter. */
  serviceAuth?: Pick<ServiceAuthOptions, 'fetch' | 'now' | 'random'>;
}): AppLink {
  const credential = readRunnerCredential(options);
  if (!credential) throw new Error(`${SERVICE_CREDENTIAL_ENV} is not set`);
  const { kind, id } = credential.target;
  if (kind !== 'deployment')
    throw new Error(
      `${SERVICE_CREDENTIAL_ENV} is not a deployment's credential (kind ${kind})`,
    );
  // The cache files sealed sets under the key's RFC 7638 thumbprint: computed
  // here, never taken from the claim, so two keys never share a folder.
  if (jwkThumbprint(credential.enc) !== credential.enc.kid)
    throw new Error(
      `${SERVICE_CREDENTIAL_ENV} is not a walkerOS credential (enc.kid)`,
    );
  const auth = createServiceAuth(credential, {
    logger: options.logger,
    ...options.serviceAuth,
  });
  const now = options.serviceAuth?.now ?? Date.now;

  return {
    origin: auth.origin,
    deploymentId: id,
    keyId: credential.enc.kid,
    authorize: auth.authorize,
    answered(answer) {
      // The next check-in is the retry: what `answered` answers is not used.
      auth.answered(answer);
    },
    async readSecretSet(bytes, expect) {
      try {
        return await openSealedSecretSet(bytes, {
          key: credential.enc,
          deployment: expect.deployment,
          sequence: expect.sequence,
        });
      } catch (error) {
        // The opener's fact quotes no part of the set, a value or a key.
        throw new ReleaseRefusal(
          'secret-set',
          expect.sequence,
          undefined,
          messageOf(error),
        );
      }
    },
    async signStep({ method, url, contentDigest }) {
      assertDoorTarget({ method, url }, credential);
      return signDoorRequest({
        method,
        url,
        contentDigest,
        key: credential.sig,
        tag: SIGNATURE_TAGS.ingest,
        created: Math.floor(now() / 1000),
      });
    },
    close() {
      auth.close();
    },
  };
}

/**
 * Runs one channel call to the app and hands its answer to `answered`: the
 * status on success, `appAnswerOf` (status and headers) on a ChannelError,
 * and nothing for a failure with no answer of the app's own, such as
 * storage's after the archive's redirect. The call's error is thrown on.
 */
export async function appCall<T>(
  link: Pick<AppLink, 'answered'>,
  call: () => Promise<T>,
  statusOf: (value: T) => number,
): Promise<T> {
  let value: T;
  try {
    value = await call();
  } catch (error) {
    const answer = appAnswerOf(error);
    if (answer) link.answered(answer);
    throw error;
  }
  link.answered({ status: statusOf(value) });
  return value;
}
