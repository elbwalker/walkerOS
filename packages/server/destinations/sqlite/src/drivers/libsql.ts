import type { SqliteClient } from '../types';

/**
 * libSQL / Turso driver -- async HTTP(S)/WSS/local file driver.
 *
 * Loaded via dynamic require to stay an optional peer dep and let tests mock
 * via jest.mock('@libsql/client').
 */
interface LibsqlExecuteArgs {
  sql: string;
  args?: ReadonlyArray<unknown>;
}

interface LibsqlClient {
  execute: (input: LibsqlExecuteArgs) => Promise<unknown>;
  close: () => void;
}

interface LibsqlCreateClientConfig {
  url: string;
  authToken?: string;
}

type CreateClientFn = (config: LibsqlCreateClientConfig) => LibsqlClient;

export async function createLibsqlClient(
  url: string,
  authToken?: string,
): Promise<SqliteClient> {
  let createClient: CreateClientFn;
  try {
    const loaded = require('@libsql/client') as {
      createClient?: CreateClientFn;
      default?: { createClient?: CreateClientFn };
    };
    const fn = loaded.createClient ?? loaded.default?.createClient;
    if (typeof fn !== 'function') {
      throw new Error('createClient export not found on @libsql/client');
    }
    createClient = fn;
  } catch (err) {
    throw new Error(
      '@walkeros/server-destination-sqlite: @libsql/client is not installed. ' +
        'Install it with `npm install @libsql/client`, or use a local file URL. ' +
        `Original error: ${String(err)}`,
    );
  }

  const client = createClient({ url, authToken });

  return {
    async execute(sql, args = []) {
      await client.execute({ sql, args });
    },
    prepare(sql) {
      // libSQL has no server-side prepared-statement cache for HTTP; we close over
      // the sql string and call execute() per run. Cost is negligible vs network RTT.
      return async (args) => {
        await client.execute({ sql, args });
      };
    },
    async close() {
      client.close();
    },
  };
}
