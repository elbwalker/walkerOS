import type { PartialConfig } from '../types';
import { getConfig } from '../config';

/** What a call throws, or undefined. */
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

const BASE = { url: 'https://m.example.com/', siteId: '1' };

describe('getConfig', () => {
  it.each<[string, PartialConfig, string]>([
    [
      'missing url and siteId',
      { settings: {} },
      'Config settings url, siteId missing',
    ],
    [
      'a url ending in matomo.php',
      { settings: { url: 'https://m.example.com/matomo.php', siteId: '1' } },
      'settings.url is the Matomo base URL, like https://matomo.example.com/, without matomo.php',
    ],
    [
      'a static siteId that is not a number',
      { settings: { ...BASE, siteId: 'abc' } },
      'settings.siteId is the Matomo site ID, a positive integer like 1',
    ],
    [
      'a static siteId of 0',
      { settings: { ...BASE, siteId: 0 } },
      'settings.siteId is the Matomo site ID, a positive integer like 1',
    ],
    [
      'a static siteId that is not an integer',
      { settings: { ...BASE, siteId: '1.5' } },
      'settings.siteId is the Matomo site ID, a positive integer like 1',
    ],
    [
      'a static url without a scheme',
      { settings: { ...BASE, url: 'matomo.example.com' } },
      'settings.url is the Matomo base URL, an http(s) URL like https://matomo.example.com/',
    ],
    [
      'a static url that is not http(s)',
      { settings: { ...BASE, url: 'ftp://m.example.com/' } },
      'settings.url is the Matomo base URL, an http(s) URL like https://matomo.example.com/',
    ],
    [
      'ip without credentials.token',
      { settings: { ...BASE, ip: 'ingest.ip' } },
      'Matomo records the visitor IP (cip) only with token_auth: set credentials.token, or remove settings.ip',
    ],
  ])('init refuses %s', (_, config, message) => {
    expect(thrown(() => getConfig(config))).toMatchObject({
      code: 'config',
      message,
    });
  });

  it('accepts ip with credentials.token', () => {
    const config = getConfig({
      settings: { ...BASE, ip: 'ingest.ip' },
      credentials: { token: 'T' },
    });
    expect(config.settings.ip).toBe('ingest.ip');
    expect(config.credentials).toEqual({ token: 'T' });
  });

  it('accepts a value config for siteId and url', () => {
    const settings = {
      url: { key: 'ingest.matomoUrl' },
      siteId: { key: 'ingest.siteId' },
    };
    expect(getConfig({ settings }).settings).toEqual(settings);
  });
});
