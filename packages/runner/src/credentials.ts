/**
 * The runner's link to the app: one service credential, `WALKEROS_CREDENTIAL`,
 * from a pairing on the Self-hosted tab or written into a managed container.
 * It names the app's origin and the runner's deployment, so no other variable
 * is read. Without it the runner runs open source and calls no app.
 */

import type { Logger } from '@walkeros/core';
import type { KnownValues } from '@walkeros/core/node';
import {
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

/** Whether `env` names a credential, checked without reading it. */
export function holdsCredential(env: NodeJS.ProcessEnv): boolean {
  return env[SERVICE_CREDENTIAL_ENV] !== undefined;
}

/**
 * Read the credential once, before any flow code loads, and remove it from
 * `env`, so no step and no child reads it. Its value joins the masked values,
 * so no line shows it. Undefined without the variable; a value that is no
 * walkerOS credential throws the fact, naming the variable, never the value.
 */
export function connectApp(options: {
  env: NodeJS.ProcessEnv;
  logger: Logger.Instance;
  knownValues: KnownValues;
}): ServiceAuth | undefined {
  const raw = options.env[SERVICE_CREDENTIAL_ENV];
  if (raw) options.knownValues.add([raw]);
  const credential = readServiceCredential(options.env);
  if (!credential) return undefined;
  return createServiceAuth(credential, { logger: options.logger });
}
