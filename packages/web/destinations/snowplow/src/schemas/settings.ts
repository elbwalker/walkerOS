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
  session: z
    .boolean()
    .optional()
    .describe('Client session context - enables client_session schema'),
  browser: z.boolean().optional().describe('Browser context'),
  performanceTiming: z
    .boolean()
    .optional()
    .describe('Performance timing context'),
  geolocation: z.boolean().optional().describe('Geolocation context'),
});

/**
 * Anonymous tracking configuration schema
 */
export const AnonymousTrackingConfigSchema = z.object({
  withServerAnonymisation: z
    .boolean()
    .optional()
    .describe('Request server-side anonymisation'),
  withSessionTracking: z
    .boolean()
    .optional()
    .describe('Continue session tracking in anonymous mode'),
});

/**
 * Anonymous tracking schema - can be boolean or config object
 */
export const AnonymousTrackingSchema = z.union([
  z.boolean(),
  AnonymousTrackingConfigSchema,
]);

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
export const SettingsSchema = z
  .object({
    collectorUrl: z.string().describe('Snowplow collector endpoint URL'),
    scriptUrl: z
      .string()
      .optional()
      .describe(
        'URL of the Snowplow JavaScript tracker script, used with loadScript. Defaults to the jsdelivr CDN with the @latest tag; pin a version in production.',
      ),
    tracker: z
      .record(z.string(), z.any())
      .optional()
      .describe(
        'Browser-tracker functions for bundled mode (newTracker, trackSelfDescribingEvent and the optional others), set with $code: references',
      ),
    appId: z.string().optional().describe('Application identifier'),
    trackerName: z.string().optional().describe('Tracker instance name'),
    platform: z.string().optional().describe('Platform identifier'),
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
    // Anonymous tracking
    anonymousTracking: AnonymousTrackingSchema.optional().describe(
      'Enable anonymous tracking (no user identifiers)',
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
    trackPageView: z
      .boolean()
      .optional()
      .describe('Call trackPageView once right after the tracker starts'),
    pageViewEvent: z
      .string()
      .optional()
      .describe(
        'Event name that calls trackPageView instead of a self-describing event (like page view)',
      ),
    userId: z
      .unknown()
      .optional()
      .describe(
        'walkerOS mapping value resolving to the user id, set once on the first event where it resolves',
      ),
    page: z
      .object({
        type: z.unknown().describe('Mapping value resolving to the page type'),
        language: z
          .unknown()
          .optional()
          .describe('Mapping value resolving to the page language'),
        locale: z
          .unknown()
          .optional()
          .describe('Mapping value resolving to the page locale'),
      })
      .optional()
      .describe('Page context for setPageType (ecommerce plugin)'),
    consent: z
      .object({
        required: z
          .array(z.string())
          .optional()
          .describe('walkerOS consent groups to check'),
        basisForProcessing: z
          .string()
          .optional()
          .describe('Legal basis for processing under GDPR (default consent)'),
        consentUrl: z
          .string()
          .optional()
          .describe('URL of the privacy policy or consent document'),
        consentVersion: z
          .string()
          .optional()
          .describe('Version of the consent document'),
        domainsApplied: z
          .array(z.string())
          .optional()
          .describe('Domains where this consent applies'),
        gdprApplies: z
          .boolean()
          .optional()
          .describe('Whether GDPR applies to this user'),
      })
      .optional()
      .describe(
        'Consent event tracking through the Enhanced Consent plugin, used by the consent handler',
      ),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
export type SnowplowSettings = z.infer<typeof SnowplowSettingsSchema>;
export type TrackerContexts = z.infer<typeof TrackerContextsSchema>;
export type UrlBasedPlugin = z.infer<typeof UrlBasedPluginSchema>;
export type ActivityTracking = z.infer<typeof ActivityTrackingSchema>;
