import type {
  Config,
  Env,
  PartialConfig,
  Settings,
  SqliteSettings,
} from './types';
import type { Logger } from '@walkeros/core';
import { isObject } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const raw = (partialConfig.settings ?? {}) as Partial<Settings>;
  const sqlite: Partial<SqliteSettings> =
    raw.sqlite ?? ({} as Partial<SqliteSettings>);

  if (!sqlite.url) {
    logger.throw('Config settings sqlite.url missing');
  }

  const sqliteSettings: SqliteSettings = {
    ...sqlite,
    url: sqlite.url as string,
    table: sqlite.table ?? 'events',
  };

  // Migration shim: settings.sqlite.schema is the predecessor of config.setup.
  // Accept BOTH for one minor cycle, emit a deprecation WARN if `schema` is
  // used. Removed in the next major.
  if (sqlite.schema !== undefined) {
    logger.warn(
      'config.settings.sqlite.schema is deprecated; use config.setup instead. ' +
        '"schema: auto" maps to "setup: true" (run "walkeros setup destination.<id>"); ' +
        '"schema: manual" maps to "setup: false". This field is removed in the next major.',
    );
    if (sqlite.schema === 'manual' && !partialConfig.mapping) {
      // Preserve the existing throw for the legacy "manual without mapping" case.
      logger.throw(
        'Config settings sqlite.schema="manual" requires a mapping (no default column mapping will be used).',
      );
    }
    sqliteSettings._legacyAutoCreate = sqlite.schema === 'auto';
    // Legacy `schema: 'manual'` opted out of the auto-create AND opted out of
    // the table-existence probe (user brings their own table). Honor that.
    sqliteSettings._legacySkipProbe = sqlite.schema === 'manual';
  } else {
    // No legacy schema flag. Default behavior: do NOT auto-create in init().
    // The user must run `walkeros setup destination.<id>` or set `config.setup: true`.
    sqliteSettings._legacyAutoCreate = false;
    sqliteSettings._legacySkipProbe = false;
  }

  // Strip the deprecated key from the live settings object so downstream code
  // never reads it. The flag is preserved on `_legacyAutoCreate`.
  delete sqliteSettings.schema;

  const settings: Settings = { sqlite: sqliteSettings };

  return { ...partialConfig, settings };
}

export function isSqliteEnv(env: unknown): env is Env {
  if (!isObject(env)) return false;
  const maybe = env as { SqliteDriver?: unknown; client?: unknown };
  return (
    typeof maybe.SqliteDriver === 'function' || isObject(maybe.client ?? null)
  );
}
