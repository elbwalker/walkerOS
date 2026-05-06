import type { LifecycleContext, Logger } from '@walkeros/core';
import { resolveSetup } from '@walkeros/core';
import type { DestinationServer } from '@walkeros/server-core';
import type { Env, Setup, SetupColumn, SqliteClient, Types } from './types';
import { isSqliteEnv } from './config';
import { createClientFromSettings } from './drivers';

// Setup is wired to the destination's `setup` slot which uses the broader
// `DestinationServer.Config<Types>` (settings is optional). We runtime-narrow
// instead of using the local Config alias so the assignment in index.ts
// type-checks without contravariance issues.
type WideConfig = DestinationServer.Config<Types>;

/**
 * Default 15-column walkerOS Event v4 canonical schema.
 * Mirrors BigQuery (Plan 2). Only `name` is REQUIRED.
 */
export const DEFAULT_SCHEMA: SetupColumn[] = [
  { name: 'name', type: 'TEXT', notNull: true },
  { name: 'data', type: 'TEXT' },
  { name: 'context', type: 'TEXT' },
  { name: 'globals', type: 'TEXT' },
  { name: 'custom', type: 'TEXT' },
  { name: 'user', type: 'TEXT' },
  { name: 'nested', type: 'TEXT' },
  { name: 'consent', type: 'TEXT' },
  { name: 'id', type: 'TEXT' },
  { name: 'trigger', type: 'TEXT' },
  { name: 'entity', type: 'TEXT' },
  { name: 'action', type: 'TEXT' },
  { name: 'timestamp', type: 'TEXT' },
  { name: 'timing', type: 'INTEGER' },
  { name: 'source', type: 'TEXT' },
];

export const DEFAULT_PRAGMAS: Record<string, string> = {
  journal_mode: 'WAL',
  synchronous: 'NORMAL',
  foreign_keys: 'ON',
  temp_store: 'MEMORY',
};

export const DEFAULT_SETUP: Required<Setup> = {
  pragmas: DEFAULT_PRAGMAS,
  schema: DEFAULT_SCHEMA,
  indexes: [],
};

export interface SetupResult {
  tableCreated: boolean;
  pragmasApplied: string[];
  indexesCreated: string[];
}

interface PragmaTableInfoRow {
  name: string;
  type: string;
}

interface SqliteMasterRow {
  name: string;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isPragmaTableInfoRow(value: unknown): value is PragmaTableInfoRow {
  if (typeof value !== 'object' || value === null) return false;
  const obj: Record<string, unknown> = { ...value };
  return isString(obj.name) && isString(obj.type);
}

function isSqliteMasterRow(value: unknown): value is SqliteMasterRow {
  if (typeof value !== 'object' || value === null) return false;
  const obj: Record<string, unknown> = { ...value };
  return isString(obj.name);
}

function buildCreateTableSql(table: string, columns: SetupColumn[]): string {
  const lines = columns.map((c) => {
    const parts: string[] = [c.name, c.type];
    if (c.primaryKey) parts.push('PRIMARY KEY');
    if (c.notNull) parts.push('NOT NULL');
    return parts.join(' ');
  });
  return `CREATE TABLE IF NOT EXISTS ${table} (\n  ${lines.join(',\n  ')}\n)`;
}

async function tableExists(
  client: SqliteClient,
  table: string,
): Promise<boolean> {
  const rows = await client.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [table],
  );
  for (const row of rows) {
    if (isSqliteMasterRow(row) && row.name === table) return true;
  }
  return false;
}

async function detectDrift(
  client: SqliteClient,
  table: string,
  declared: SetupColumn[],
  logger: Logger.Instance,
): Promise<void> {
  const rows = await client.query(`PRAGMA table_info(${table})`);
  const actualByName = new Map<string, string>();
  for (const row of rows) {
    if (isPragmaTableInfoRow(row)) {
      actualByName.set(row.name, row.type.toUpperCase());
    }
  }

  for (const declaredCol of declared) {
    const actualType = actualByName.get(declaredCol.name);
    if (actualType === undefined) {
      logger.warn('setup.drift', {
        field: declaredCol.name,
        declared: declaredCol.type,
        actual: 'missing',
      });
      continue;
    }
    if (actualType !== declaredCol.type.toUpperCase()) {
      logger.warn('setup.drift', {
        field: declaredCol.name,
        declared: declaredCol.type,
        actual: actualType,
      });
    }
  }
}

export const setup = async (
  ctx: LifecycleContext<WideConfig, Env>,
): Promise<SetupResult | undefined> => {
  const { config, env, logger } = ctx;
  const merged = resolveSetup(config.setup, DEFAULT_SETUP);
  if (!merged) {
    logger.debug('setup: skipped (config.setup is false or unset)');
    return;
  }
  const options: Required<Setup> = {
    pragmas: { ...DEFAULT_PRAGMAS, ...(merged.pragmas ?? {}) },
    schema: merged.schema ?? DEFAULT_SCHEMA,
    indexes: merged.indexes ?? [],
  };

  const sqlite = config.settings?.sqlite;
  if (!sqlite || !sqlite.url) {
    logger.throw('setup: settings.sqlite.url is missing');
    return;
  }
  const table = sqlite.table ?? 'events';

  // Open transient client (or reuse env-injected one). We do NOT touch
  // sqlite._client / sqlite._runInsert here, setup is a separate lifecycle.
  let client: SqliteClient;
  let owned = true;
  if (isSqliteEnv(env) && env.client) {
    client = env.client;
    owned = false;
  } else if (isSqliteEnv(env) && env.SqliteDriver) {
    client = await env.SqliteDriver(sqlite.url, sqlite.authToken);
  } else {
    client = await createClientFromSettings(sqlite.url, sqlite.authToken);
  }

  try {
    // 1. Pragmas first (some, like journal_mode, must apply before any write).
    const pragmasApplied: string[] = [];
    for (const [key, value] of Object.entries(options.pragmas)) {
      await client.execute(`PRAGMA ${key} = ${value}`);
      pragmasApplied.push(key);
    }

    // 2. Probe whether the table already exists, so tableCreated is reported correctly.
    const tableExisted = await tableExists(client, table);

    // 3. CREATE TABLE IF NOT EXISTS with the declared schema.
    await client.execute(buildCreateTableSql(table, options.schema));

    // 4. Drift detection. Only when the table existed before; on fresh create
    //    the schema matches by definition. Setup never auto-mutates: drift is
    //    surfaced via WARN logs, never via ALTER TABLE.
    if (tableExisted) {
      await detectDrift(client, table, options.schema, logger);
    }

    // 5. Indexes (CREATE INDEX IF NOT EXISTS).
    const indexesCreated: string[] = [];
    for (const idx of options.indexes) {
      const unique = idx.unique ? 'UNIQUE ' : '';
      const cols = idx.columns.join(', ');
      await client.execute(
        `CREATE ${unique}INDEX IF NOT EXISTS ${idx.name} ON ${table}(${cols})`,
      );
      indexesCreated.push(idx.name);
    }

    return {
      tableCreated: !tableExisted,
      pragmasApplied,
      indexesCreated,
    };
  } finally {
    if (owned) {
      try {
        await client.close();
      } catch {
        /* swallow close errors during setup */
      }
    }
  }
};

export { tableExists };
