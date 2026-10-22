import { getConfig, normalizeUrl } from '../config';

describe('getConfig', () => {
  it.each([
    ['url', { appId: 'site-1' }],
    ['appId', { url: 'https://acc.piwik.pro' }],
  ])('throws when %s is missing', (name, settings) => {
    expect(() => getConfig({ settings })).toThrow(
      `Config settings ${name} missing`,
    );
  });

  it('normalizes url and keeps every other setting unchanged', () => {
    const config = getConfig({
      settings: {
        url: 'https://acc.piwik.pro',
        appId: 'site-1',
        timeout: 2000,
        identified: { marketing: true },
        ip: false,
        customDimensions: { '1': 'data.size' },
      },
      consent: { analytics: true },
    });

    expect(config).toEqual({
      settings: {
        url: 'https://acc.piwik.pro/',
        appId: 'site-1',
        timeout: 2000,
        identified: { marketing: true },
        ip: false,
        customDimensions: { '1': 'data.size' },
      },
      consent: { analytics: true },
    });
  });
});

describe('normalizeUrl', () => {
  it.each([
    'https://acc.piwik.pro',
    'https://acc.piwik.pro/',
    'https://acc.piwik.pro//',
  ])('%s ends with exactly one slash', (url) => {
    expect(normalizeUrl(url)).toBe('https://acc.piwik.pro/');
  });
});
