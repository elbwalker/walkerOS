import type { Flow } from '@walkeros/core';

/**
 * The settings Piwik PRO needs to deliver: the account URL and the app ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    url: 'https://your_account_name.piwik.pro/',
    appId: 'XXX-XXX-XXX-XXX-XXX',
  },
};
