import type { Flow } from '@walkeros/core';

/**
 * The settings Piwik PRO needs to deliver: the account URL and the app ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    url: 'https://your_account_name.piwik.pro/',
    appId: 'e8f3a1c2-0b4d-4e5f-9a6b-7c8d9e0f1a2b',
  },
};
