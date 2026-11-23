import type { ServiceCredential } from '@walkeros/core';
import { decodeServiceCredential } from '@walkeros/core';

/** The one variable a runner, a data agent or an automation reads its credential from. */
export const SERVICE_CREDENTIAL_ENV = 'WALKEROS_CREDENTIAL';

/**
 * The credential in `WALKEROS_CREDENTIAL`, read once. The name is removed from
 * `env` before its value is checked, so no child process inherits it and a
 * refused start leaves none behind. Null when the name is not set; a value
 * that is not a credential throws the fact, never the value.
 */
export function readServiceCredential(
  env: NodeJS.ProcessEnv = process.env,
): ServiceCredential | null {
  const raw = env[SERVICE_CREDENTIAL_ENV];
  delete env[SERVICE_CREDENTIAL_ENV];
  if (raw === undefined) return null;
  return decodeServiceCredential(raw);
}
