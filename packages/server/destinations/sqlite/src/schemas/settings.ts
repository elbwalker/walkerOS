import { z } from '@walkeros/core/dev';

export const SqliteSettingsSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe(
      "SQLite connection URL. libsql://, http(s)://, ws(s):// route to libSQL/Turso. Anything else is treated as a local file path via better-sqlite3. Use ':memory:' for an ephemeral in-memory database.",
    ),
  authToken: z
    .string()
    .describe(
      'libSQL / Turso auth token. Ignored for better-sqlite3 (local) connections.',
    )
    .optional(),
  table: z
    .string()
    .describe('Target table name. Defaults to "events".')
    .optional(),
  schema: z
    .enum(['auto', 'manual'])
    .describe(
      '"auto" creates the canonical events table with CREATE TABLE IF NOT EXISTS on init. "manual" skips table creation. The user brings their own schema and mapping.',
    )
    .optional(),
});

export const SettingsSchema = z.object({
  sqlite: SqliteSettingsSchema.describe(
    "SQLite / libSQL configuration (like { url: './events.db' } or { url: 'libsql://my-db.turso.io', authToken: '...' })",
  ),
});

export type Settings = z.infer<typeof SettingsSchema>;
