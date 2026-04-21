import type { Destination, Env, Settings, SqliteClient } from './types';
import { getConfig, isSqliteEnv } from './config';
import { createClientFromSettings } from './drivers';
import { buildCreateTableSql, buildInsertSql } from './serialize';
import { push } from './push';

// Types re-export
export * as DestinationSQLite from './types';

// Examples
export * as examples from './examples';

// Serialization helpers (exported for tests and advanced consumers)
export {
  CANONICAL_COLUMNS,
  buildCreateTableSql,
  buildInsertSql,
  eventToRow,
} from './serialize';

// Driver URL detection (exported for tests and advanced consumers)
export { isLibsqlUrl } from './drivers';

export const destinationSQLite: Destination = {
  type: 'sqlite',

  config: {},

  async init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;
    const sqlite = settings.sqlite;

    // Skip creation if a client has already been wired in (testing).
    if (sqlite._client) return config;

    let client: SqliteClient | undefined;

    // Prefer env-injected client / factory (tests, dependency injection).
    if (isSqliteEnv(env)) {
      const envTyped = env as Env;
      if (envTyped.client) {
        client = envTyped.client;
      } else if (envTyped.SqliteDriver) {
        client = await envTyped.SqliteDriver(sqlite.url, sqlite.authToken);
      }
    }

    // Production path: load real driver based on the URL prefix.
    if (!client) {
      try {
        client = await createClientFromSettings(sqlite.url, sqlite.authToken);
      } catch (err) {
        logger.throw(
          `@walkeros/server-destination-sqlite: driver load failed: ${String(err)}`,
        );
        return config;
      }
    }

    // Create the canonical events table unless the user opted out.
    if (sqlite.schema === 'auto') {
      try {
        await client.execute(buildCreateTableSql(sqlite.table ?? 'events'));
      } catch (err) {
        logger.throw(
          `@walkeros/server-destination-sqlite: CREATE TABLE failed: ${String(err)}`,
        );
        return config;
      }
    }

    // Cache the prepared insert for per-event calls.
    sqlite._client = client;
    sqlite._runInsert = client.prepare(
      buildInsertSql(sqlite.table ?? 'events'),
    );
    sqlite._ownedClient = !(isSqliteEnv(env) && (env as Env).client);

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const settings = config?.settings as Settings | undefined;
    const sqlite = settings?.sqlite;
    if (!sqlite) return;

    const client = sqlite._client;
    // Only close clients the destination created (not user-provided).
    if (client && sqlite._ownedClient) {
      try {
        await client.close();
      } finally {
        sqlite._client = undefined;
        sqlite._runInsert = undefined;
        sqlite._ownedClient = undefined;
      }
    }
  },
};

export default destinationSQLite;
