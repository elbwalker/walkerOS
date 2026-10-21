import type { PushFn, SqliteClient, SqliteSettings } from './types';
import { isString, StepError } from '@walkeros/core';
import { buildCreateTableSql, buildInsertSql, eventToRow } from './serialize';
import { tableExists } from './setup';

type RunInsert = (args: ReadonlyArray<unknown>) => Promise<void>;

/**
 * Check a table and prepare its insert: the legacy `schema: 'auto'` creates
 * the table, the default path probes it and fails with `config` when it is
 * missing (with the setup hint for the destination's own table, which setup
 * creates).
 */
async function prepareTable(
  sqlite: SqliteSettings,
  client: SqliteClient,
  id: string,
  table: string,
): Promise<RunInsert> {
  const own = table === (sqlite.table ?? 'events');
  if (sqlite._legacyAutoCreate) {
    try {
      await client.execute(buildCreateTableSql(table));
    } catch (err) {
      throw new StepError('SQLite CREATE TABLE failed', {
        code: 'transport',
        cause: err,
      });
    }
  } else if (!sqlite._legacySkipProbe) {
    let exists: boolean;
    try {
      exists = await tableExists(client, table);
    } catch (err) {
      throw new StepError('SQLite table probe failed', {
        code: 'transport',
        cause: err,
      });
    }
    if (!exists)
      throw new StepError(
        own
          ? `SQLite table "${table}" not found in ${sqlite.url}. ` +
              `Run "walkeros setup destination.${id}" to create it.`
          : `SQLite table "${table}" (rule settings.table) not found in ${sqlite.url}.`,
        { code: 'config' },
      );
  }
  try {
    return await client.prepare(buildInsertSql(table));
  } catch (err) {
    throw new StepError('SQLite prepare failed', {
      code: 'transport',
      cause: err,
    });
  }
}

/**
 * The insert of a table, checked and prepared at its first push, once per
 * table. A failed attempt is retried at the next push.
 */
function insertOf(
  sqlite: SqliteSettings,
  client: SqliteClient,
  id: string,
  table: string,
): Promise<RunInsert> {
  const tables = (sqlite._ready ??= new Map());
  let ready = tables.get(table);
  if (!ready) {
    const preparing = prepareTable(sqlite, client, id, table);
    preparing.catch(() => {
      if (tables.get(table) === preparing) tables.delete(table);
    });
    tables.set(table, preparing);
    ready = preparing;
  }
  return ready;
}

/**
 * A constraint violation (a duplicate id under the setup's unique index, a
 * NOT NULL column) fails the same way on every attempt: not retryable.
 */
function isConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT');
}

// A silent rule has no INSERT of its own: nothing to write.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await insert(event, context);
};

const insert: PushFn = async function (event, { config, rule, logger, id }) {
  const sqlite = config.settings?.sqlite;
  const client = sqlite?._client;
  if (!sqlite || !client)
    throw new StepError('SQLite client not initialized', {
      code: 'not-ready',
    });

  const ruleSettings = rule?.settings ?? {};
  const ruleTable = isString(ruleSettings.table) ? ruleSettings.table : '';

  // A rule may write to its own table; each table is checked once.
  const effectiveTable = ruleTable || sqlite.table || 'events';
  const runInsert = await insertOf(sqlite, client, id, effectiveTable);

  const row = eventToRow(event);

  logger.debug('SQLite INSERT', {
    table: effectiveTable,
    eventName: event.name,
  });

  try {
    await runInsert(row);
  } catch (error) {
    // The collector reports it; the driver's own message stays the cause.
    throw new StepError('SQLite INSERT failed', {
      code: 'transport',
      retryable: !isConstraintError(error),
      cause: error,
    });
  }
  logger.debug('SQLite INSERT complete', { table: effectiveTable });
};
