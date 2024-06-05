import type { WalkerOS } from '@elbwalker/types';

export function parseUserAgent(
  userAgent: string,
  window: Window,
  navigator: Navigator,
): WalkerOS.User {
  return {
    userAgent,
    language: getLanguage(navigator),
    timezone: getTimezone(),
    browser: getBrowser(userAgent),
    browserVersion: getBrowserVersion(userAgent),
    os: getOS(userAgent),
    osVersion: getOSVersion(userAgent),
    deviceType: getDeviceType(userAgent, window, navigator),
    screenSize: getScreenSize(window),
  };
}

export function getLanguage(navigator: Navigator): string | undefined {
  return navigator.language;
}

export function getTimezone(): string | undefined {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getBrowser(ua: string): string | undefined {
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
      ua.includes(browser.substr) &&
      (!browser.exclude || !ua.includes(browser.exclude))
    ) {
      return browser.name;
    }
  }
}

export function getBrowserVersion(ua: string): string | undefined {
  const rules = [
    /Edg\/([0-9]+)/, // Edge
    /Chrome\/([0-9]+)/, // Chrome
    /Version\/([0-9]+).*Safari/, // Safari
    /Firefox\/([0-9]+)/, // Firefox
    /MSIE ([0-9]+)/, // IE 10 and older
    /rv:([0-9]+).*Trident/, // IE 11
  ];

  for (const regex of rules) {
    const match = ua.match(regex);
    if (match) {
      return match[1];
    }
  }
}

export function getOS(ua: string): string | undefined {
  const osList = [
    { name: 'Windows', substr: 'Windows NT' },
    { name: 'macOS', substr: 'Mac OS X' },
    { name: 'Android', substr: 'Android' },
    { name: 'iOS', substr: 'iPhone OS' },
    { name: 'Linux', substr: 'Linux' },
  ];

  for (const os of osList) {
    if (ua.includes(os.substr)) {
      return os.name;
    }
  }
}

export function getOSVersion(ua: string): string | undefined {
  const osVersionRegex = /(?:Windows NT|Mac OS X|Android|iPhone OS) ([0-9._]+)/;
  const match = ua.match(osVersionRegex);
  return match ? match[1].replace(/_/g, '.') : undefined;
}

export function getDeviceType(
  ua: string,
  window: Window,
  navigator: Navigator,
): string | undefined {
  if (/Mobi|Android/i.test(ua)) {
    return 'Mobile';
  }

  const width = window.innerWidth;
  if (width <= 768) {
    return 'Mobile';
  } else if (width <= 1024) {
    return 'Tablet';
  }

  const isTouchDevice =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice && width > 768 && width <= 1024) {
    return 'Tablet';
  }

  return 'Desktop';
}

export function getScreenSize(window: Window): string {
  return `${window.screen.width}x${window.screen.height}`;
}
