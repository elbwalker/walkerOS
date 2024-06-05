import {
  parseUserAgent,
  getLanguage,
  getTimezone,
  getBrowser,
  getOS,
  getOSVersion,
  getDeviceType,
  getScreenSize,
  getBrowserVersion,
} from '../..';

describe('UserAgent', () => {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';
  const window = {
    innerWidth: 1337,
    innerHeight: 420,
    screen: {
      width: 1337,
      height: 420,
    },
  } as Window;
  const navigator = {
    language: 'de-DE',
  } as Navigator;

  test('parseUserAgent', () => {
    const parsedUserAgent = parseUserAgent(userAgent, window, navigator);

    expect(parsedUserAgent).toStrictEqual(
      expect.objectContaining({
        userAgent,
      }),
    );
  });

  test('getLanguage', () => {
    const language = getLanguage(navigator);
    expect(language).toBe('de-DE');
  });

  test('getTimezone', () => {
    const timezone = getTimezone();
    expect(timezone).toBeDefined();
  });

  test('getBrowser', () => {
    const browser = getBrowser(userAgent);
    expect(browser).toBe('Chrome');
  });

  test('getBrowserVersion', () => {
    const browser = getBrowserVersion(userAgent);
    expect(browser).toBe('96');
  });

  test('getOS', () => {
    const os = getOS(userAgent);
    expect(os).toBe('Windows');
  });

  test('getOSVersion', () => {
    const osVersion = getOSVersion(userAgent);
    expect(osVersion).toBe('10.0');
  });

  test('getDeviceType', () => {
    const deviceType = getDeviceType(userAgent, window, navigator);
    expect(deviceType).toBe('Desktop');
  });

  test('getScreenSize', () => {
    const screenSize = getScreenSize(window);
    expect(screenSize).toBe('1337x420');
  });
});
