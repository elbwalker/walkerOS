import { z } from '@walkeros/core';

/**
 * Hostname regex pattern for domain validation
 * Matches valid hostnames according to RFC 1123
 */
const hostnameRegex =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))*$/;

/**
 * Plausible Settings Schema
 * Configuration for Plausible analytics destination
 */
export const SettingsSchema = z.object({
  domain: z
    .string()
    .regex(hostnameRegex, 'Must be a valid hostname')
    .describe('Your website domain for Plausible tracking (e.g., example.com)')
    .optional(),
});

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
