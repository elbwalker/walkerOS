/**
 * The runner's link to the app: one service credential, `WALKEROS_CREDENTIAL`,
 * from a pairing on the Self-hosted tab or written into a managed container.
 * It names the app's origin and the runner's deployment, so no other variable
 * is read. Without it the runner runs open source and calls no app.
 */

import type { Authorize, Logger, ServiceCredential } from '@walkeros/core';
import type { KnownValues } from '@walkeros/core/node';
import {
  createDoorAuthorize,
  createServiceAuth,
  readServiceCredential,
  SERVICE_CREDENTIAL_ENV,
  type ServiceAuth,
} from '@walkeros/server-core';

/**
 * What the runner's app calls use of the credential's client: the origin every
 * app call goes to, the headers of one request, and the answer to report.
 */
export type AppAuth = Pick<ServiceAuth, 'origin' | 'authorize' | 'answered'>;

/**
 * What the runner makes of its credential: the client of its app calls, and
 * for a deployment's runner the door signer its flow's steps get, which signs
 * the steps' ingest writes and never a request to the app or its auth server.
 */
export interface RunnerLink {
  app: ServiceAuth;
  steps?: Authorize;
}

/** Whether `env` names a credential, checked without reading it. */
export function holdsCredential(env: NodeJS.ProcessEnv): boolean {
  return env[SERVICE_CREDENTIAL_ENV] !== undefined;
}

/**
 * The credential in `WALKEROS_CREDENTIAL`, read once, for start mode and
 * remote mode alike: the raw value joins the masked values first, so no line
 * shows it even when it does not read, and the variable is removed from
 * `env` before its value is checked, so no child inherits it. Undefined
 * without the variable; a value that is no walkerOS credential throws the
 * fact, naming the variable, never the value.
 */
export function readRunnerCredential(options: {
  env: NodeJS.ProcessEnv;
  knownValues: KnownValues;
}): ServiceCredential | undefined {
  const raw = options.env[SERVICE_CREDENTIAL_ENV];
  if (raw) options.knownValues.add([raw]);
  return readServiceCredential(options.env) ?? undefined;
}

/**
 * Read the credential once, before any flow code loads, and remove it from
 * `env`, so no step and no child reads it. Without it the runner runs open
 * source and calls no app. Only a deployment's credential writes ingest, so
 * only it gets `steps`.
 */
export function connectApp(options: {
  env: NodeJS.ProcessEnv;
  logger: Logger.Instance;
  knownValues: KnownValues;
}): RunnerLink | undefined {
  const credential = readRunnerCredential(options);
  if (!credential) return undefined;
  return {
    app: createServiceAuth(credential, { logger: options.logger }),
    ...(credential.target.kind === 'deployment'
      ? { steps: createDoorAuthorize(credential) }
      : {}),
  };
}
