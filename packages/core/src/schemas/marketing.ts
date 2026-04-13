import { z } from './validation';

/**
 * Click-ID registry entry — maps a URL parameter name to a canonical platform.
 *
 * Runtime use of this schema is optional; `getMarketingParameters()` accepts
 * plain `ClickIdEntry` objects without validating. This schema exists for
 * dev tooling (Explorer UI, MCP package_get, JSON Schema generation).
 */
export const ClickIdEntrySchema = z.object({
  param: z
    .string()
    .describe(
      'Lowercase URL parameter name. Match is case-insensitive on lookup.',
    ),
  platform: z
    .string()
    .describe('Canonical platform identifier (lowercase, kebab-case).'),
});
