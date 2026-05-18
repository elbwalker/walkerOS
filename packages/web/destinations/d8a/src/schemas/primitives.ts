import { z } from '@walkeros/core/dev';

export const ConsentModeSchema = z.union([
  z.boolean(),
  z.record(z.string(), z.union([z.string(), z.array(z.string())])),
]);

const csvOrArray = z.union([z.string(), z.array(z.string())]);

export const SettingsSchema = z.object({
  property_id: z.string().describe('d8a property ID'),
  server_container_url: z
    .string()
    .url()
    .describe('d8a collector URL for the property'),
  como: ConsentModeSchema.describe(
    'Consent mode configuration: false (disabled), true (use defaults), or custom mapping',
  ).optional(),
  data: z.any().describe('Custom data mapping configuration').optional(),
  dataLayerName: z
    .string()
    .describe('Name of the d8a command queue (default: d8aLayer)')
    .optional(),
  globalName: z
    .string()
    .describe('Name of the global d8a function (default: d8a)')
    .optional(),
  send_page_view: z
    .boolean()
    .describe('Enable automatic pageview tracking')
    .optional(),
  snakeCase: z
    .boolean()
    .describe('Convert event names to snake_case (like true)')
    .optional(),
  debug_mode: z.boolean().describe('Enable debug mode').optional(),
  cookie_domain: z
    .string()
    .describe('Cookie domain strategy: auto, none, or a specific domain')
    .optional(),
  cookie_path: z.string().describe('Cookie path').optional(),
  cookie_expires: z.number().describe('Cookie lifetime in seconds').optional(),
  cookie_flags: z.string().describe('Raw cookie flags').optional(),
  cookie_prefix: z.string().describe('Cookie name prefix').optional(),
  cookie_update: z
    .boolean()
    .describe('Refresh cookie expirations on activity')
    .optional(),
  session_timeout_ms: z
    .number()
    .describe('Session timeout window in milliseconds')
    .optional(),
  session_engagement_time_sec: z
    .number()
    .describe('Minimum engaged time in seconds')
    .optional(),
  flush_interval_ms: z
    .number()
    .describe('Flush interval in milliseconds')
    .optional(),
  max_batch_size: z.number().describe('Maximum batch size').optional(),
  user_id: z.string().describe('GA4-style user ID').optional(),
  client_id: z.string().describe('Client ID override').optional(),
  campaign_id: z.string().optional(),
  campaign_source: z.string().optional(),
  campaign_medium: z.string().optional(),
  campaign_name: z.string().optional(),
  campaign_term: z.string().optional(),
  campaign_content: z.string().optional(),
  page_location: z.string().optional(),
  page_title: z.string().optional(),
  page_referrer: z.string().optional(),
  content_group: z.string().optional(),
  language: z.string().optional(),
  screen_resolution: z.string().optional(),
  ignore_referrer: z.boolean().optional(),
  site_search_enabled: z.boolean().optional(),
  site_search_query_params: csvOrArray.optional(),
  outbound_clicks_enabled: z.boolean().optional(),
  outbound_exclude_domains: csvOrArray.optional(),
  file_downloads_enabled: z.boolean().optional(),
  file_download_extensions: csvOrArray.optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
