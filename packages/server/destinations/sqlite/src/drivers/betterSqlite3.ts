import type { SqliteClient } from '../types';

/**
 * better-sqlite3 driver -- synchronous native SQLite for local files and ':memory:'.
 * Wrapped in Promise.resolve so the cross-driver interface is always async.
 *
 * The library is loaded via dynamic require to allow tests to mock via
 * jest.mock('better-sqlite3'), and to keep it as an optional peer dependency.
 */
interface BetterSqliteStatement {
  run: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => ReadonlyArray<Record<string, unknown>>;
}

interface BetterSqliteDatabase {
  prepare: (sql: string) => BetterSqliteStatement;
  close: () => void;
}

interface BetterSqliteConstructor {
  new (filePath: string): BetterSqliteDatabase;
}

export async function createBetterSqliteClient(
  filePath: string,
): Promise<SqliteClient> {
  let Database: BetterSqliteConstructor;
  try {
    // Dynamic require so the module stays an optional peer dep and tests can mock.
    const loaded = require('better-sqlite3') as
      | BetterSqliteConstructor
      | { default: BetterSqliteConstructor };
    Database =
      'default' in loaded && typeof loaded.default === 'function'
        ? loaded.default
        : (loaded as BetterSqliteConstructor);
  } catch (err) {
    throw new Error(
      '@walkeros/server-destination-sqlite: better-sqlite3 is not installed. ' +
        'Install it with `npm install better-sqlite3`, or switch settings.sqlite.url to a libSQL URL. ' +
        `Original error: ${String(err)}`,
    );
  }

  const db = new Database(filePath);

  return {
    async execute(sql, args = []) {
      db.prepare(sql).run(...(args as unknown[]));
    },
    prepare(sql) {
      const stmt = db.prepare(sql);
      return async (args) => {
        stmt.run(...(args as unknown[]));
      };
    },
    async query(sql, args = []) {
      return db.prepare(sql).all(...(args as unknown[]));
    },
    async close() {
      db.close();
    },
  };
}
