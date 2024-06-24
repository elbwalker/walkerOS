import type { WalkerOS } from '@elbwalker/types';
import type { MarketingParameters } from '../../core';
import type { SessionData } from '../../web';
import { getMarketingParameters } from '../../core/getMarketingParameters';
import { getId } from '../../core/getId';

export interface SessionWindowConfig {
  data?: WalkerOS.Properties;
  domains?: string[];
  isStart?: boolean;
  parameters?: MarketingParameters;
  referrer?: string;
  url?: string;
}

export function sessionWindow(config: SessionWindowConfig = {}): SessionData {
  let isStart = false;
  const known = { isStart, storage: false };

  // If session has explicitly started, return known
  if (config.isStart === false) return known;

  // Entry type
  if (!isStart) {
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

    isStart = true;
  }

  // Referrer
  if (!isStart) {
    // Small chance of multiple unintended events for same users
    // https://en.wikipedia.org/wiki/HTTP_referer#Referrer_hiding
    // Use domains: [''] to disable direct or hidden referrer

    const domains = config.domains || [];
    domains.push(url.hostname);
    isStart = !domains.includes(referrer);
  }

  return isStart
    ? // It's a session start, moin
      Object.assign(
        {
          isStart,
          storage: false,
          start: Date.now(),
          id: getId(12),
          referrer,
        },
        marketing,
        config.data,
      )
    : // No session start
      known;
}
