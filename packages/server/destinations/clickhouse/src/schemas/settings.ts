import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe(
      'ClickHouse HTTP endpoint (like https://host.clickhouse.cloud:8443)',
    ),
  database: z
    .string()
    .min(1)
    .default('default')
    .describe('Database holding the events table (like analytics)'),
  table: z
    .string()
    .min(1)
    .default('events')
    .describe('Table every event is inserted into (like events)'),
  maxRetries: z
    .number()
    .int()
    .min(0)
    .default(1)
    .describe(
      'Retries added on top of the first attempt, so total attempts = 1 + maxRetries (like 1 for two attempts)',
    ),
  clickhouse: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Raw @clickhouse/client options merged into the created client (like { request_timeout: 60000 })',
    ),
  clickhouseSettings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'ClickHouse settings applied to every insert (like { async_insert: 1 })',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
