import type { Logger } from '@walkeros/core';

/**
 * Structural view of the credential-bearing parts of a store config, shared by
 * the `storeSheetsInit` and `setup` read sites (whose config generics differ:
 * the init context erases the credentials slot to `unknown`). The resolved
 * value is validated downstream by `parseCredentials`.
 */
interface CredentialConfig {
  credentials?: unknown;
  settings?: { credentials?: unknown };
}

/**
 * Resolve the credential value from the config, preferring the standard
 * `config.credentials` slot and falling back to the deprecated
 * `settings.credentials`. Uses `??` semantics (`!== undefined`) so an explicit
 * empty-string credential surfaces a misconfig instead of silently falling
 * through to settings/ADC.
 *
 * Warns once per instance when the deprecated `settings.credentials` path is
 * used. Call this at the init-time read site (which runs once per instance);
 * there is no module-level once-flag so a second instance still warns.
 */
export function resolveCredentials(
  config: CredentialConfig,
  logger: Logger.Instance,
): unknown {
  if (config.credentials !== undefined) return config.credentials;

  const fromSettings = config.settings?.credentials;
  if (fromSettings !== undefined) {
    logger.warn('settings.credentials is deprecated; use config.credentials');
    return fromSettings;
  }

  return undefined;
}
