import type { Flow } from '@walkeros/core';

/**
 * The settings X Ads needs to deliver: the pixel and event IDs, and the
 * four OAuth credentials, read from the environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: {
    pixelId: 'o8z6j',
    eventId: 'tw-o8z6j-o8z21',
    consumerKey: 'consumer-key',
    consumerSecret: 'consumer-secret',
    accessToken: 'access-token',
    accessTokenSecret: 'access-token-secret',
  },
  secrets: {
    consumerKey: 'TWITTER_CONSUMER_KEY',
    consumerSecret: 'TWITTER_CONSUMER_SECRET',
    accessToken: 'TWITTER_ACCESS_TOKEN',
    accessTokenSecret: 'TWITTER_ACCESS_TOKEN_SECRET',
  },
};
