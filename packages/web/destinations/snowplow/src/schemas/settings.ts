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
 * Tracker contexts schema
 */
export const TrackerContextsSchema = z.object({
  webPage: z.boolean().optional().describe('Web page context'),
  session: z.boolean().optional().describe('Client session context'),
  performanceTiming: z
    .boolean()
    .optional()
    .describe('Performance timing context'),
  geolocation: z.boolean().optional().describe('Geolocation context'),
});

/**
 * URL-based plugin schema
 */
export const UrlBasedPluginSchema = z.object({
  url: z.string().describe('Plugin script URL'),
  name: z
    .tuple([z.string(), z.string()])
    .describe('[globalName, constructorName]'),
  enableMethod: z.string().optional().describe('Override enable method name'),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Options for enable method'),
});

/**
 * Activity tracking configuration schema
 */
export const ActivityTrackingSchema = z.object({
  minimumVisitLength: z.number().describe('Seconds before first ping'),
  heartbeatDelay: z.number().describe('Seconds between pings'),
});

/**
 * Static global context schema
 */
export const StaticGlobalContextSchema = z.object({
  schema: z.string().describe('Iglu schema URI'),
  data: z.record(z.string(), z.unknown()).describe('Context data'),
});

/**
 * Mapped global context schema
 */
export const MappedGlobalContextSchema = z.object({
  schema: z.string().describe('Iglu schema URI'),
  data: z.record(z.string(), z.unknown()).describe('walkerOS mapping'),
  __mapped: z.literal(true),
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
  // New tracker configuration options
  discoverRootDomain: z
    .boolean()
    .optional()
    .describe('Discover root domain for cookies'),
  cookieSameSite: z
    .enum(['Strict', 'Lax', 'None'])
    .optional()
    .describe('Cookie SameSite attribute'),
  appVersion: z.string().optional().describe('Application version'),
  contexts: TrackerContextsSchema.optional().describe(
    'Built-in context entities',
  ),
  // Plugins - validated loosely since BrowserPlugin is complex
  plugins: z
    .array(z.union([UrlBasedPluginSchema, z.any()]))
    .optional()
    .describe('Snowplow plugins'),
  // Activity tracking
  activityTracking: ActivityTrackingSchema.optional().describe(
    'Page ping configuration',
  ),
  // Global contexts - validated loosely to allow functions
  globalContexts: z
    .array(z.any())
    .optional()
    .describe('Global context entities'),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SnowplowSettings = z.infer<typeof SnowplowSettingsSchema>;
export type TrackerContexts = z.infer<typeof TrackerContextsSchema>;
export type UrlBasedPlugin = z.infer<typeof UrlBasedPluginSchema>;
export type ActivityTracking = z.infer<typeof ActivityTrackingSchema>;
