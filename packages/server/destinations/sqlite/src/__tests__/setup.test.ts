import { createMockLogger } from '@walkeros/core';
import { setup, DEFAULT_SCHEMA, DEFAULT_PRAGMAS } from '../setup';
import type { Config, Env, SqliteClient } from '../types';

interface SpyCall {
  kind: 'execute' | 'query' | 'prepare' | 'run' | 'close';
  sql?: string;
  args?: ReadonlyArray<unknown>;
}

interface ClientHarness {
  client: SqliteClient;
  calls: SpyCall[];
  setQueryResult: (
    matcher: (sql: string) => boolean,
    rows: ReadonlyArray<Record<string, unknown>>,
  ) => void;
}

function makeClientSpy(): ClientHarness {
  const calls: SpyCall[] = [];
  const queryHandlers: Array<{
    match: (sql: string) => boolean;
    rows: ReadonlyArray<Record<string, unknown>>;
  }> = [];

  const client: SqliteClient = {
    async execute(sql, args = []) {
      calls.push({ kind: 'execute', sql, args });
    },
    prepare(sql) {
      calls.push({ kind: 'prepare', sql });
      return async (args) => {
        calls.push({ kind: 'run', sql, args });
      };
    },
    async query(sql, args = []) {
      calls.push({ kind: 'query', sql, args });
      for (const handler of queryHandlers) {
        if (handler.match(sql)) return handler.rows;
      }
      return [];
    },
    async close() {
      calls.push({ kind: 'close' });
    },
  };

  return {
    client,
    calls,
    setQueryResult(match, rows) {
      queryHandlers.push({ match, rows });
    },
  };
}

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    settings: { sqlite: { url: ':memory:', table: 'events' } },
    setup: true,
    ...overrides,
  };
}

describe('setup', () => {
  test('creates table when missing', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    const env: Env = { client: harness.client };

    const result = await setup({
      id: 'sqlite',
      config: makeConfig(),
      env,
      logger,
    });

    expect(result).toMatchObject({ tableCreated: true });

    const executes = harness.calls.filter((c) => c.kind === 'execute');
    const pragmaSqls = executes
      .map((c) => c.sql ?? '')
      .filter((s) => s.startsWith('PRAGMA'));
    expect(pragmaSqls).toContain('PRAGMA journal_mode = WAL');
    expect(pragmaSqls).toContain('PRAGMA synchronous = NORMAL');
    expect(pragmaSqls).toContain('PRAGMA foreign_keys = ON');
    expect(pragmaSqls).toContain('PRAGMA temp_store = MEMORY');

    const create = executes.find((c) =>
      (c.sql ?? '').startsWith('CREATE TABLE IF NOT EXISTS events'),
    );
    expect(create).toBeDefined();
  });

  test('idempotent re-run reports tableCreated: false when table already exists', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    harness.setQueryResult(
      (sql) => sql.includes('sqlite_master'),
      [{ name: 'events' }],
    );
    harness.setQueryResult(
      (sql) => sql.includes('PRAGMA table_info'),
      DEFAULT_SCHEMA.map((c, idx) => ({
        cid: idx,
        name: c.name,
        type: c.type,
        notnull: c.notNull ? 1 : 0,
        dflt_value: null,
        pk: c.primaryKey ? 1 : 0,
      })),
    );
    const env: Env = { client: harness.client };

    const result = await setup({
      id: 'sqlite',
      config: makeConfig(),
      env,
      logger,
    });

    expect(result).toMatchObject({ tableCreated: false });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('applies pragmas regardless of table existence', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    harness.setQueryResult(
      (sql) => sql.includes('sqlite_master'),
      [{ name: 'events' }],
    );
    harness.setQueryResult(
      (sql) => sql.includes('PRAGMA table_info'),
      DEFAULT_SCHEMA.map((c, idx) => ({
        cid: idx,
        name: c.name,
        type: c.type,
        notnull: c.notNull ? 1 : 0,
        dflt_value: null,
        pk: c.primaryKey ? 1 : 0,
      })),
    );
    const env: Env = { client: harness.client };

    await setup({ id: 'sqlite', config: makeConfig(), env, logger });

    const pragmaCalls = harness.calls
      .filter((c) => c.kind === 'execute')
      .filter((c) => (c.sql ?? '').startsWith('PRAGMA '));
    expect(pragmaCalls.length).toBe(Object.keys(DEFAULT_PRAGMAS).length);
  });

  test('merges custom pragmas with defaults; overrides win', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    const env: Env = { client: harness.client };

    await setup({
      id: 'sqlite',
      config: makeConfig({
        setup: { pragmas: { journal_mode: 'DELETE', cache_size: 2000 } },
      }),
      env,
      logger,
    });

    const pragmaSqls = harness.calls
      .filter((c) => c.kind === 'execute')
      .map((c) => c.sql ?? '')
      .filter((s) => s.startsWith('PRAGMA '));

    expect(pragmaSqls).toContain('PRAGMA journal_mode = DELETE');
    expect(pragmaSqls).not.toContain('PRAGMA journal_mode = WAL');
    expect(pragmaSqls).toContain('PRAGMA synchronous = NORMAL');
    expect(pragmaSqls).toContain('PRAGMA cache_size = 2000');
  });

  test('drift detection warns on column type mismatch and never alters', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    harness.setQueryResult(
      (sql) => sql.includes('sqlite_master'),
      [{ name: 'events' }],
    );
    // Table exists but `timing` column is TEXT instead of INTEGER.
    harness.setQueryResult(
      (sql) => sql.includes('PRAGMA table_info'),
      DEFAULT_SCHEMA.map((c, idx) => ({
        cid: idx,
        name: c.name,
        type: c.name === 'timing' ? 'TEXT' : c.type,
        notnull: c.notNull ? 1 : 0,
        dflt_value: null,
        pk: c.primaryKey ? 1 : 0,
      })),
    );
    const env: Env = { client: harness.client };

    await setup({ id: 'sqlite', config: makeConfig(), env, logger });

    expect(logger.warn).toHaveBeenCalledWith(
      'setup.drift',
      expect.objectContaining({
        field: 'timing',
        declared: 'INTEGER',
        actual: 'TEXT',
      }),
    );

    // Critical: never ALTER TABLE from setup.
    const altered = harness.calls.find(
      (c) =>
        c.kind === 'execute' &&
        (c.sql ?? '').toUpperCase().startsWith('ALTER TABLE'),
    );
    expect(altered).toBeUndefined();
  });

  test('drift detection warns when declared column missing from actual table', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    harness.setQueryResult(
      (sql) => sql.includes('sqlite_master'),
      [{ name: 'events' }],
    );
    // Actual table is missing the `source` column.
    harness.setQueryResult(
      (sql) => sql.includes('PRAGMA table_info'),
      DEFAULT_SCHEMA.filter((c) => c.name !== 'source').map((c, idx) => ({
        cid: idx,
        name: c.name,
        type: c.type,
        notnull: c.notNull ? 1 : 0,
        dflt_value: null,
        pk: c.primaryKey ? 1 : 0,
      })),
    );
    const env: Env = { client: harness.client };

    await setup({ id: 'sqlite', config: makeConfig(), env, logger });

    expect(logger.warn).toHaveBeenCalledWith(
      'setup.drift',
      expect.objectContaining({
        field: 'source',
        declared: 'TEXT',
        actual: 'missing',
      }),
    );
  });

  test('creates indexes via CREATE INDEX IF NOT EXISTS', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    const env: Env = { client: harness.client };

    await setup({
      id: 'sqlite',
      config: makeConfig({
        setup: {
          indexes: [
            { name: 'idx_events_name', columns: ['name'] },
            { name: 'idx_unique_id', columns: ['id'], unique: true },
          ],
        },
      }),
      env,
      logger,
    });

    const indexSqls = harness.calls
      .filter((c) => c.kind === 'execute')
      .map((c) => c.sql ?? '')
      .filter((s) => s.includes('INDEX'));

    expect(indexSqls).toEqual(
      expect.arrayContaining([
        'CREATE INDEX IF NOT EXISTS idx_events_name ON events(name)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_id ON events(id)',
      ]),
    );
  });

  test('config.setup === false short-circuits with no SQL issued', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    const env: Env = { client: harness.client };

    await setup({
      id: 'sqlite',
      config: makeConfig({ setup: false }),
      env,
      logger,
    });

    expect(harness.calls).toEqual([]);
  });

  test('config.setup === undefined short-circuits with no SQL issued', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    const env: Env = { client: harness.client };

    await setup({
      id: 'sqlite',
      config: makeConfig({ setup: undefined }),
      env,
      logger,
    });

    expect(harness.calls).toEqual([]);
  });

  test('hard-fails when settings.sqlite.url is missing', async () => {
    const logger = createMockLogger();
    const harness = makeClientSpy();
    const env: Env = { client: harness.client };

    const config: Config = {
      settings: { sqlite: { url: '' } },
      setup: true,
    };

    await expect(setup({ id: 'sqlite', config, env, logger })).rejects.toThrow(
      /sqlite\.url/,
    );
  });
});
