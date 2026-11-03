import { z } from '@walkeros/core/dev';

export const SqliteSettingsSchema = z
  .object({
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
        '"auto" creates the table (and each rule table) at the first push, with the columns every insert writes. "manual" skips the table check: the table is yours, and init fails without a config.mapping. Either value logs a WARN at init.',
      )
      .optional(),
  })
  .strict();

export const SettingsSchema = z
  .object({
    sqlite: SqliteSettingsSchema.describe(
      "SQLite / libSQL configuration (like { url: './events.db' } or { url: 'libsql://my-db.turso.io', authToken: '...' })",
    ),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
