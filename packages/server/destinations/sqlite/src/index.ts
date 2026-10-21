import type { Destination, Env, Settings, SqliteClient } from './types';
import { getConfig, isSqliteEnv } from './config';
import { createClientFromSettings } from './drivers';
import { StepError } from '@walkeros/core';
import { push } from './push';
import { setup } from './setup';

// Types re-export
export * as DestinationSQLite from './types';

// Serialization helpers (exported for tests and advanced consumers)
export {
  CANONICAL_COLUMNS,
  buildCreateTableSql,
  buildInsertSql,
  eventToRow,
} from './serialize';

// Driver URL detection (exported for tests and advanced consumers)
export { isLibsqlUrl } from './drivers';

// Setup helpers (exported for tests and advanced consumers)
export { setup, DEFAULT_SCHEMA, DEFAULT_PRAGMAS, DEFAULT_SETUP } from './setup';

export const destinationSQLite: Destination = {
  type: 'sqlite',

  config: {},

  setup,

  async init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const sqlite = config.settings.sqlite;

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
        throw new StepError('SQLite driver load failed', {
          code: 'not-ready',
          cause: err,
        });
      }
    }

    // The table check and the prepared insert run at the first push, so
    // init does no query that can fail.
    sqlite._client = client;
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
        sqlite._ready = undefined;
        sqlite._ownedClient = undefined;
      }
    }
  },
};

export default destinationSQLite;
