import type { PushFn, SqliteClient, SqliteSettings } from './types';
import { isString, StepError } from '@walkeros/core';
import { buildCreateTableSql, buildInsertSql, eventToRow } from './serialize';
import { tableExists } from './setup';

type RunInsert = (args: ReadonlyArray<unknown>) => Promise<void>;

/**
 * Check the table and prepare the insert, once per client: the legacy
 * `schema: 'auto'` creates it, the default path probes it and fails with
 * the setup hint when it is missing. A failed attempt is retried at the next
 * push.
 */
async function prepareTable(
  sqlite: SqliteSettings,
  client: SqliteClient,
  id: string,
): Promise<RunInsert> {
  const table = sqlite.table ?? 'events';
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
        `SQLite table "${table}" not found in ${sqlite.url}. ` +
          `Run "walkeros setup destination.${id}" to create it.`,
        { code: 'config' },
      );
  }
  return prepare(client, table);
}

/** A prepared insert; the driver call may answer synchronously or not. */
async function prepare(
  client: SqliteClient,
  table: string,
): Promise<RunInsert> {
  try {
    return await client.prepare(buildInsertSql(table));
  } catch (err) {
    throw new StepError('SQLite prepare failed', {
      code: 'transport',
      cause: err,
    });
  }
}

/** The insert of the destination's table, prepared at the first push. */
function insertOf(
  sqlite: SqliteSettings,
  client: SqliteClient,
  id: string,
): Promise<RunInsert> {
  if (!sqlite._ready) {
    const ready = prepareTable(sqlite, client, id);
    ready.catch(() => {
      if (sqlite._ready === ready) sqlite._ready = undefined;
    });
    sqlite._ready = ready;
  }
  return sqlite._ready;
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

  // If the rule overrides the table, we can't reuse the cached prepared statement
  // (which was bound to the default table). Build an ad-hoc prepared run.
  const effectiveTable = ruleTable || sqlite.table || 'events';
  const runInsert =
    ruleTable && ruleTable !== sqlite.table
      ? await prepare(client, effectiveTable)
      : (sqlite._runInsert ?? (await insertOf(sqlite, client, id)));

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
      cause: error,
    });
  }
  logger.debug('SQLite INSERT complete', { table: effectiveTable });
};
