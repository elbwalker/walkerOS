import { z } from '@walkeros/core/dev';

/**
 * Snowplow-specific settings schema (similar to GA4Settings in gtag)
 */
export const SnowplowSettingsSchema = z.object({
  actionSchema: z.string().optional().describe('Ecommerce action schema URI'),
  productSchema: z.string().optional().describe('Product entity schema URI'),
  cartSchema: z.string().optional().describe('Cart entity schema URI'),
  transactionSchema: z
    .string()
    .optional()
    .describe('Transaction entity schema URI'),
  refundSchema: z.string().optional().describe('Refund entity schema URI'),
  checkoutStepSchema: z
    .string()
    .optional()
    .describe('Checkout step entity schema URI'),
  promotionSchema: z
    .string()
    .optional()
    .describe('Promotion entity schema URI'),
  userSchema: z.string().optional().describe('User entity schema URI'),
  customSchemas: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom entity schemas'),
  currency: z.string().optional().describe('Default currency code (ISO 4217)'),
});

/**
 * Configuration settings schema for Snowplow destination
 */
export const SettingsSchema = z.object({
  collectorUrl: z
    .string()
    .optional()
    .describe('Snowplow collector endpoint URL'),
  appId: z.string().optional().describe('Application identifier'),
  trackerName: z.string().optional().describe('Tracker instance name'),
  platform: z.string().optional().describe('Platform identifier'),
  pageViewTracking: z
    .boolean()
    .optional()
    .describe('Enable automatic page view tracking'),
  snowplow: SnowplowSettingsSchema.optional().describe(
    'Snowplow-specific ecommerce configuration',
  ),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SnowplowSettings = z.infer<typeof SnowplowSettingsSchema>;
