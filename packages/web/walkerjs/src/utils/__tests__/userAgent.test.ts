import {
  parseUserAgent,
  getBrowser,
  getOS,
  getOSVersion,
  getDeviceType,
  getBrowserVersion,
} from '@walkerOS/utils';

describe('UserAgent', () => {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36';

  test('parseUserAgent', () => {
    const parsedUserAgent = parseUserAgent(userAgent);

    expect(parsedUserAgent).toStrictEqual(
      expect.objectContaining({
        userAgent,
      }),
    );
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
    const deviceType = getDeviceType(userAgent);
    expect(deviceType).toBe('Desktop');
  });
});
