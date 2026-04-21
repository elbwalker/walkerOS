import type { WalkerOS } from '@walkeros/core';
import { isObject, isString } from '@walkeros/core';

/**
 * Canonical columns for the auto-created events table. Order matters -- used
 * to build both CREATE TABLE and the prepared INSERT.
 */
export const CANONICAL_COLUMNS = [
  'timestamp',
  'event_id',
  'name',
  'entity',
  'action',
  'session_id',
  'user_id',
  'page_url',
  'page_title',
  'referrer_url',
  'data',
  'globals',
  'consent',
] as const;

export function buildCreateTableSql(table: string): string {
  return `CREATE TABLE IF NOT EXISTS ${table} (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  timestamp    INTEGER,
  event_id     TEXT,
  name         TEXT,
  entity       TEXT,
  action       TEXT,
  session_id   TEXT,
  user_id      TEXT,
  page_url     TEXT,
  page_title   TEXT,
  referrer_url TEXT,
  data         TEXT,
  globals      TEXT,
  consent      TEXT
)`;
}

export function buildInsertSql(table: string): string {
  const cols = CANONICAL_COLUMNS.join(', ');
  const placeholders = CANONICAL_COLUMNS.map(() => '?').join(', ');
  return `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
}

/**
 * Map a walkerOS event onto the canonical column order. JSON blobs are
 * stringified. Missing fields become empty strings / zeros.
 */
export function eventToRow(event: WalkerOS.Event): unknown[] {
  const data = isObject(event.data) ? event.data : {};
  const title = isString(data.title) ? data.title : '';

  return [
    typeof event.timestamp === 'number' ? event.timestamp : Date.now(),
    event.id ?? '',
    event.name ?? '',
    event.entity ?? '',
    event.action ?? '',
    event.user?.session ?? '',
    event.user?.id ?? '',
    event.source?.id ?? '',
    title,
    event.source?.previous_id ?? '',
    JSON.stringify(data),
    JSON.stringify(event.globals ?? {}),
    JSON.stringify(event.consent ?? {}),
  ];
}
