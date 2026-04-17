import { z } from '@walkeros/core/dev';

export const RedisSettingsSchema = z.object({
  streamKey: z
    .string()
    .min(1)
    .describe(
      "Redis stream key name (like 'walkeros:events'). All events are appended to this stream via XADD.",
    ),
  url: z
    .string()
    .describe(
      "Redis connection URL (like 'redis://localhost:6379' or 'rediss://:password@host:6380'). Supports redis:// and rediss:// (TLS) protocols.",
    )
    .optional(),
  options: z
    .record(z.string(), z.unknown())
    .describe(
      'ioredis connection options. Used when url is not provided. Supports host, port, password, db, tls, and all other ioredis options.',
    )
    .optional(),
  maxLen: z
    .number()
    .int()
    .positive()
    .describe(
      'Maximum stream length. Enables approximate MAXLEN trimming on every XADD to bound memory usage (like 50000).',
    )
    .optional(),
  exactTrimming: z
    .boolean()
    .describe(
      'Use exact MAXLEN instead of approximate (~). Not recommended for production. Default: false.',
    )
    .optional(),
  serialization: z
    .enum(['json', 'flat'])
    .describe(
      "Serialization mode. 'json' stores the full event as a single 'event' field (default). 'flat' stores top-level event fields as separate stream entry fields.",
    )
    .optional(),
});

export const SettingsSchema = z.object({
  redis: RedisSettingsSchema.describe(
    "Redis Streams configuration (like { streamKey: 'walkeros:events', url: 'redis://localhost:6379' })",
  ),
});

export type Settings = z.infer<typeof SettingsSchema>;
