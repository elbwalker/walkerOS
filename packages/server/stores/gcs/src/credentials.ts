import type { Logger, Store } from '@walkeros/core';
import type { Types } from './types';

type ResolvedCredentials = Store.Credentials<Types>;

/**
 * The two credential read sites narrow different slots: `store.ts` runs inside
 * the `Store.Init` context, where the typed `credentials` slot is widened back
 * to `unknown` (settings is `Partial`); `setup.ts` runs with the full
 * `Store.Config<Types>`, where `credentials` is `ResolvedCredentials`. Accept
 * `unknown` for both and narrow at runtime.
 */
interface CredentialSources {
  credentials?: unknown;
  settings?: { credentials?: unknown };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Narrow an unknown credential candidate to the resolved credential shape: a
 * JSON string (often a `$env` reference) or a parsed service-account object.
 * Anything else resolves to `undefined`; the downstream parser surfaces a
 * misconfiguration rather than this layer guessing.
 */
function asCredential(value: unknown): ResolvedCredentials | undefined {
  if (typeof value === 'string') return value;
  if (
    isRecord(value) &&
    typeof value.client_email === 'string' &&
    typeof value.private_key === 'string'
  ) {
    const { client_email, private_key, project_id } = value;
    return typeof project_id === 'string'
      ? { client_email, private_key, project_id }
      : { client_email, private_key };
  }
  return undefined;
}

/**
 * Resolve the credential source for the store, preferring the strictly-typed
 * `config.credentials` slot and falling back to the deprecated
 * `settings.credentials`. Returns the raw credential (string or object); the
 * caller parses it into a service account.
 *
 * Precedence is `??` (not `||`) so an explicitly-empty `config.credentials`
 * surfaces as a misconfiguration rather than silently falling through.
 *
 * Warn-once semantics: the warning fires from the init/setup read site, which
 * runs once per store instance. No module-level flag, so a second instance on
 * the deprecated path still warns.
 */
export function resolveCredentials(
  config: CredentialSources,
  logger?: Logger.Instance,
): ResolvedCredentials | undefined {
  if (config.credentials !== undefined) return asCredential(config.credentials);

  const fromSettings = config.settings?.credentials;
  if (fromSettings !== undefined && logger) {
    logger.warn(
      'gcs store: settings.credentials is deprecated, use config.credentials',
    );
  }
  return asCredential(fromSettings);
}
