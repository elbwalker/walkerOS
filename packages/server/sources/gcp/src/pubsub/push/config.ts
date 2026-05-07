import type { Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import type { Config, PartialConfig, Settings } from './types';

/**
 * Validate and normalize the push source's partial config.
 *
 * No required fields. Defaults: decoder = 'json', verifyOidc = false.
 */
export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = partialConfig.settings ?? {};
  const resolved: Settings = {
    decoder: settings.decoder ?? 'json',
    verifyOidc: settings.verifyOidc ?? false,
  };
  if (settings.projectId) resolved.projectId = settings.projectId;
  if (settings.audience) resolved.audience = settings.audience;

  if (resolved.verifyOidc && !resolved.audience) {
    logger.throw(
      'Config settings audience missing (required when verifyOidc is true)',
    );
  }
  return { ...partialConfig, settings: resolved };
}

export function isPubSubPushEnv(env: unknown): boolean {
  if (!isObject(env)) return false;
  const candidate: { verifyOidcToken?: unknown } = env;
  return (
    candidate.verifyOidcToken === undefined ||
    typeof candidate.verifyOidcToken === 'function'
  );
}
