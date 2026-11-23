import type { Config, Credentials, PartialConfig, Settings } from './types';
import { StepError } from '@walkeros/core';
import { isMissing, toPositiveInteger } from './items';

/** Ends the base URL with exactly one slash, so `${url}matomo.php` is valid. */
export function normalizeUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

/** Whether a URL uses http: or https:, the schemes Matomo's tracker answers on. */
export function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The settings init refuses, as `config` errors: a missing url or siteId, a
 * static siteId or url that no event can make valid, a url pointing at the
 * tracker file instead of the base URL, and an ip without the token Matomo
 * requires for cip. A value config is checked per event instead.
 */
export function checkSettings(
  settings: Partial<Settings>,
  credentials?: Credentials,
): asserts settings is Settings {
  const required: Array<'url' | 'siteId'> = ['url', 'siteId'];
  const missing = required.filter((key) => isMissing(settings[key]));
  if (missing.length)
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });

  const { siteId, url } = settings;
  if (
    (typeof siteId === 'string' || typeof siteId === 'number') &&
    toPositiveInteger(siteId) === undefined
  )
    throw new StepError(
      'settings.siteId is the Matomo site ID, a positive integer like 1',
      { code: 'config' },
    );

  if (typeof url === 'string' && !isHttpUrl(url))
    throw new StepError(
      'settings.url is the Matomo base URL, an http(s) URL like https://matomo.example.com/',
      { code: 'config' },
    );

  if (typeof url === 'string' && /\.php\/*$/i.test(url))
    throw new StepError(
      'settings.url is the Matomo base URL, like https://matomo.example.com/, without matomo.php',
      { code: 'config' },
    );

  if (settings.ip !== undefined && settings.ip !== false && !credentials?.token)
    throw new StepError(
      'Matomo records the visitor IP (cip) only with token_auth: set credentials.token, or remove settings.ip',
      { code: 'config' },
    );
}

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = partialConfig.settings || {};
  checkSettings(settings, partialConfig.credentials);
  return { ...partialConfig, settings };
}
