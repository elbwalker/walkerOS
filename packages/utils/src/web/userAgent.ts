import type { WalkerOS } from '@elbwalker/types';

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
}

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
}

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
}

export function getOSVersion(userAgent: string): string | undefined {
  const osVersionRegex = /(?:Windows NT|Mac OS X|Android|iPhone OS) ([0-9._]+)/;
  const match = userAgent.match(osVersionRegex);
  return match ? match[1].replace(/_/g, '.') : undefined;
}

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
