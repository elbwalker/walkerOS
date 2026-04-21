import type { SqliteClient, SqliteClientFactory } from '../types';
import { createBetterSqliteClient } from './betterSqlite3';
import { createLibsqlClient } from './libsql';

const LIBSQL_URL_PREFIXES = [
  'libsql://',
  'http://',
  'https://',
  'ws://',
  'wss://',
];

export function isLibsqlUrl(url: string): boolean {
  return LIBSQL_URL_PREFIXES.some((p) => url.startsWith(p));
}

/**
 * Default client factory -- picks better-sqlite3 for local file paths and
 * libSQL for remote URLs. Tests can override via env.SqliteDriver.
 */
export const defaultFactory: SqliteClientFactory = async (url, authToken) => {
  if (isLibsqlUrl(url)) return createLibsqlClient(url, authToken);
  return createBetterSqliteClient(url);
};

export async function createClientFromSettings(
  url: string,
  authToken: string | undefined,
): Promise<SqliteClient> {
  return defaultFactory(url, authToken);
}

export { createBetterSqliteClient, createLibsqlClient };
