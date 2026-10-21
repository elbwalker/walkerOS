import type { Config, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

/** Ends the account URL with exactly one slash, so `${url}ppms.php` is valid. */
export function normalizeUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = partialConfig.settings || {};
  const { url, appId } = settings;

  if (!url || !appId) {
    const missing = [...(url ? [] : ['url']), ...(appId ? [] : ['appId'])];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }

  return {
    ...partialConfig,
    settings: { ...settings, url: normalizeUrl(url), appId },
  };
}
