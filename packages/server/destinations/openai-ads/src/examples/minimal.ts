import type { Flow } from '@walkeros/core';

/**
 * The settings OpenAI Ads needs to deliver: the Conversions API key, read
 * from the environment, and the pixel ID of the web data source.
 */
export const minimal: Flow.MinimalExample = {
  settings: { apiKey: 's3cr3t', pixelId: 'px_abc123' },
  secrets: { apiKey: 'OPENAI_CONVERSIONS_API_KEY' },
};
