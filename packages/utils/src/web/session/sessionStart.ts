import { getId, getMarketingParameters } from '../../';
import type { SessionStart } from '.';
import type { WalkerOS } from '@elbwalker/types';

export default function sessionStart(
  config: SessionStart = {},
  utils: {
    getId: typeof getId;
    getMarketingParameters: typeof getMarketingParameters;
  },
): WalkerOS.Properties | false {
  // Force a new session or start checking if it's a regular new one
  let isNew = config.isNew || false;

  // Entry type
  if (!isNew) {
    // Only focus on linked or direct navigation types
    // and ignore reloads and all others
    const [perf] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    if (perf.type !== 'navigate') return false;
  }

  const url = new URL(config.url || window.location.href);
  const ref = config.referrer || document.referrer;
  const referrer = ref && new URL(ref).hostname;
  const session: WalkerOS.Properties = {};

  // Marketing
  const marketing = utils.getMarketingParameters(url, config.parameters);
  if (Object.keys(marketing).length) {
    // Check for marketing parameters like UTM and add existing
    session.marketing = true; // Flag as a marketing session
    isNew = true;
  }

  // Referrer
  if (!isNew) {
    // Small chance of multiple unintendet events for same users
    // https://en.wikipedia.org/wiki/HTTP_referer#Referrer_hiding
    // Use domains: [''] to disable direct or hidden referrer

    const domains = config.domains || [];
    domains.push(url.hostname);
    isNew = !domains.includes(referrer);
  }

  // No new session
  if (!isNew) return false;

  if (referrer) session.referrer = referrer;
  Object.assign(
    session,
    {
      id: session.id || utils.getId(12),
    },
    marketing,
    config.data,
  );

  // It's a new session, moin
  return session;
}
