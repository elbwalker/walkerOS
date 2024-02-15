import { getId, getMarketingParameters } from '../../';
import type { MarketingParameters } from '../../';
import type { WalkerOS } from '@elbwalker/types';

export interface SessionStartData extends WalkerOS.Properties {
  isNew: boolean; // If this is a new session or a known one
  id?: string; // Session ID
  start?: number; // Timestamp of session start
  marketing?: true; // If the session was started by a marketing parameters
}

export interface SessionStartConfig {
  data?: WalkerOS.Properties;
  domains?: string[];
  isNew?: boolean;
  parameters?: MarketingParameters;
  referrer?: string;
  url?: string;
}

export function sessionStart(
  config: SessionStartConfig = {},
): SessionStartData {
  const known = { isNew: false };
  // Force a new session or start checking if it's a regular new one
  let isNew = config.isNew || false;

  // Entry type
  if (!isNew) {
    // Only focus on linked or direct navigation types
    // and ignore reloads and all others
    const [perf] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    if (perf.type !== 'navigate') return known;
  }

  const url = new URL(config.url || window.location.href);
  const ref = config.referrer || document.referrer;
  const referrer = ref && new URL(ref).hostname;

  // Marketing
  const marketing = getMarketingParameters(url, config.parameters);
  if (Object.keys(marketing).length) {
    // Check for marketing parameters like UTM and add existing
    if (!marketing.marketing)
      // Flag as a marketing session without overwriting
      marketing.marketing = true;

    isNew = true;
  }

  // Referrer
  if (!isNew) {
    // Small chance of multiple unintended events for same users
    // https://en.wikipedia.org/wiki/HTTP_referer#Referrer_hiding
    // Use domains: [''] to disable direct or hidden referrer

    const domains = config.domains || [];
    domains.push(url.hostname);
    isNew = !domains.includes(referrer);
  }

  return isNew
    ? // It's a new session, moin
      Object.assign(
        {
          isNew,
          start: Date.now(),
          id: getId(12),
          referrer,
        },
        marketing,
        config.data,
      )
    : // No new session
      known;
}
