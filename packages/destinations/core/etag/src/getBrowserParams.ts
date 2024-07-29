import type { ParametersBrowser } from './types';
import { parseUserAgent } from '@elbwalker/utils';

export function getBrowserParams(
  userAgent?: string,
  language?: string,
): ParametersBrowser {
  const params: ParametersBrowser = {};

  if (userAgent) {
    const ua = parseUserAgent(userAgent);

    if (ua.os) params.uap = ua.os; // OS
    params.uamb = ua.deviceType == 'Mobile' ? 1 : 0; // Mobile
  }

  if (language) params.ul = language.toLocaleLowerCase(); // User language

  // Skip if (ua.osVersion) params.uapv = ua.osVersion; // OS Version
  // Skip architecture (uaa) and bitness (uab), and full version list (uafvl) for now
  // navigator.userAgentData is not supported in all browsers

  return params;
}
