import type { PushFn, SqliteSettings } from './types';
import { isString } from '@walkeros/core';
import { buildInsertSql, eventToRow } from './serialize';

export const push: PushFn = async function (event, { config, rule, logger }) {
  const settings = config.settings as { sqlite?: SqliteSettings } | undefined;
  const sqlite: SqliteSettings | undefined = settings?.sqlite;

  if (!sqlite) {
    logger.warn('SQLite settings missing');
    return;
  }

  const client = sqlite._client;
  if (!client) {
    logger.warn('SQLite client not initialized');
    return;
  }

  const ruleSettings = rule?.settings ?? {};
  const ruleTable = isString(ruleSettings.table) ? ruleSettings.table : '';

  // If the rule overrides the table, we can't reuse the cached prepared statement
  // (which was bound to the default table). Build an ad-hoc prepared run.
  const effectiveTable = ruleTable || sqlite.table || 'events';
  const runInsert =
    ruleTable && ruleTable !== sqlite.table
      ? client.prepare(buildInsertSql(effectiveTable))
      : sqlite._runInsert;

  if (!runInsert) {
    logger.warn('SQLite insert statement not prepared');
    return;
  }

  const row = eventToRow(event);

  logger.debug('SQLite INSERT', {
    table: effectiveTable,
    eventName: event.name,
  });

  try {
    await runInsert(row);
    logger.debug('SQLite INSERT complete', { table: effectiveTable });
  } catch (error) {
    logger.error('SQLite INSERT failed', {
      table: effectiveTable,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
