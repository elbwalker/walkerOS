import type { Flow } from '@walkeros/core';

/**
 * The settings mParticle needs to deliver: the API key and secret, read
 * from the environment.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 'key', apiSecret: 'secret' },
  secrets: { apiKey: 'MPARTICLE_API_KEY', apiSecret: 'MPARTICLE_API_SECRET' },
};
