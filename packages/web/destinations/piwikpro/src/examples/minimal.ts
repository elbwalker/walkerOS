import type { Flow } from '@walkeros/core';

/** The settings Piwik PRO needs to deliver: the site ID and the account URL, with ppms.js loaded by the destination. */
export const minimal: Flow.MinimalExample = {
  settings: {
    appId: 'XXX-XXX-XXX-XXX-XXX',
    url: 'https://your_account_name.piwik.pro/',
  },
  config: { loadScript: true },
};
