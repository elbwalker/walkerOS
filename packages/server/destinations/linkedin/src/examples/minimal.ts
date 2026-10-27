import type { Flow } from '@walkeros/core';

/**
 * The settings LinkedIn needs to deliver: the access token, read from the
 * environment, and the conversion rule ID.
 */
export const minimal: Flow.MinimalExample = {
  settings: { accessToken: 's3cr3t', conversionRuleId: '12345678' },
  secrets: { accessToken: 'LINKEDIN_ACCESS_TOKEN' },
};
