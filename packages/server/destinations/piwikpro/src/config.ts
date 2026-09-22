import type { Logger } from '@walkeros/core';
import type { Config, PartialConfig } from './types';

/** Ends the account URL with exactly one slash, so `${url}ppms.php` is valid. */
export function normalizeUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = partialConfig.settings || {};
  const { url, appId } = settings;

  if (!url) logger.throw('Config settings url missing');
  if (!appId) logger.throw('Config settings appId missing');

  return {
    ...partialConfig,
    settings: { ...settings, url: normalizeUrl(url), appId },
  };
}
