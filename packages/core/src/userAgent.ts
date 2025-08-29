import type { WalkerOS } from './types';

/**
 * Parses a user agent string to extract browser, OS, and device information.
 *
 * @param userAgent The user agent string to parse.
 * @returns An object containing the parsed user agent information.
 */
export function parseUserAgent(userAgent?: string): WalkerOS.User {
  if (!userAgent) return {};

  return {
    userAgent,
    browser: getBrowser(userAgent),
    browserVersion: getBrowserVersion(userAgent),
    os: getOS(userAgent),
    osVersion: getOSVersion(userAgent),
    deviceType: getDeviceType(userAgent),
  };
}

/**
 * Gets the browser name from a user agent string.
 *
 * @param userAgent The user agent string.
 * @returns The browser name or undefined.
 */
export function getBrowser(userAgent: string): string | undefined {
  const browsers = [
    { name: 'Edge', substr: 'Edg' },
    { name: 'Chrome', substr: 'Chrome' },
    { name: 'Safari', substr: 'Safari', exclude: 'Chrome' },
    { name: 'Firefox', substr: 'Firefox' },
    { name: 'IE', substr: 'MSIE' },
    { name: 'IE', substr: 'Trident' },
  ];

  for (const browser of browsers) {
    if (
      userAgent.includes(browser.substr) &&
      (!browser.exclude || !userAgent.includes(browser.exclude))
    ) {
      return browser.name;
    }
  }

  return;
}

/**
 * Gets the browser version from a user agent string.
 *
 * @param userAgent The user agent string.
 * @returns The browser version or undefined.
 */
export function getBrowserVersion(userAgent: string): string | undefined {
  const rules = [
    /Edg\/([0-9]+)/, // Edge
    /Chrome\/([0-9]+)/, // Chrome
    /Version\/([0-9]+).*Safari/, // Safari
    /Firefox\/([0-9]+)/, // Firefox
    /MSIE ([0-9]+)/, // IE 10 and older
    /rv:([0-9]+).*Trident/, // IE 11
  ];

  for (const regex of rules) {
    const match = userAgent.match(regex);
    if (match) {
      return match[1];
    }
  }

  return;
}

/**
 * Gets the OS name from a user agent string.
 *
 * @param userAgent The user agent string.
 * @returns The OS name or undefined.
 */
export function getOS(userAgent: string): string | undefined {
  const osList = [
    { name: 'Windows', substr: 'Windows NT' },
    { name: 'macOS', substr: 'Mac OS X' },
    { name: 'Android', substr: 'Android' },
    { name: 'iOS', substr: 'iPhone OS' },
    { name: 'Linux', substr: 'Linux' },
  ];

  for (const os of osList) {
    if (userAgent.includes(os.substr)) {
      return os.name;
    }
  }

  return;
}

/**
 * Gets the OS version from a user agent string.
 *
 * @param userAgent The user agent string.
 * @returns The OS version or undefined.
 */
export function getOSVersion(userAgent: string): string | undefined {
  const osVersionRegex = /(?:Windows NT|Mac OS X|Android|iPhone OS) ([0-9._]+)/;
  const match = userAgent.match(osVersionRegex);
  return match ? match[1].replace(/_/g, '.') : undefined;
}

/**
 * Gets the device type from a user agent string.
 *
 * @param userAgent The user agent string.
 * @returns The device type or undefined.
 */
export function getDeviceType(userAgent: string): string | undefined {
  let deviceType = 'Desktop';

  if (/Tablet|iPad/i.test(userAgent)) {
    deviceType = 'Tablet';
  } else if (
    /Mobi|Android|iPhone|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(
      userAgent,
    )
  ) {
    deviceType = 'Mobile';
  }

  return deviceType;
}
