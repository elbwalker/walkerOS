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
    schema: sqlite.schema ?? 'auto',
  };

  if (sqliteSettings.schema === 'manual' && !partialConfig.mapping) {
    logger.throw(
      'Config settings sqlite.schema="manual" requires a mapping (no default column mapping will be used).',
    );
  }

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
