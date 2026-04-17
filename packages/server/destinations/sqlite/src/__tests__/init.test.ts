import { destinationSQLite } from '..';
import type { Settings, SqliteClient, SqliteClientFactory } from '../types';

function makeLogger() {
  return {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    throw: jest.fn((msg: string) => {
      throw new Error(msg);
    }),
  };
}

function makeClientSpy(): {
  client: SqliteClient;
  calls: Array<{ kind: string; sql?: string; args?: ReadonlyArray<unknown> }>;
} {
  const calls: Array<{
    kind: string;
    sql?: string;
    args?: ReadonlyArray<unknown>;
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
    async close() {
      calls.push({ kind: 'close' });
    },
  };
  return { client, calls };
}

describe('init', () => {
  it('throws when url is missing', async () => {
    const logger = makeLogger();
    await expect(
      destinationSQLite.init({
        config: { settings: { sqlite: {} } },
        logger,
        id: 'test',
      } as never),
    ).rejects.toThrow('sqlite.url');
  });

  it('throws when schema=manual without mapping', async () => {
    const logger = makeLogger();
    await expect(
      destinationSQLite.init({
        config: {
          settings: { sqlite: { url: ':memory:', schema: 'manual' } },
        },
        logger,
        id: 'test',
      } as never),
    ).rejects.toThrow('manual');
  });

  it('uses env.client when provided and does not mark it owned', async () => {
    const logger = makeLogger();
    const { client, calls } = makeClientSpy();

    const result = await destinationSQLite.init({
      config: { settings: { sqlite: { url: ':memory:' } } },
      env: { client },
      logger,
      id: 'test',
    } as never);

    const settings = (result as { settings: Settings }).settings;
    expect(settings.sqlite._client).toBe(client);
    expect(settings.sqlite._ownedClient).toBe(false);
    expect(calls[0].kind).toBe('execute');
    expect(calls[0].sql).toMatch(/^CREATE TABLE IF NOT EXISTS events/);
    expect(calls.some((c) => c.kind === 'prepare')).toBe(true);
  });

  it('uses env.SqliteDriver factory when provided', async () => {
    const logger = makeLogger();
    const { client } = makeClientSpy();
    const factory: SqliteClientFactory = jest.fn(() => Promise.resolve(client));

    const result = await destinationSQLite.init({
      config: {
        settings: {
          sqlite: { url: 'libsql://example.turso.io', authToken: 'tk' },
        },
      },
      env: { SqliteDriver: factory },
      logger,
      id: 'test',
    } as never);

    expect(factory).toHaveBeenCalledWith('libsql://example.turso.io', 'tk');
    const settings = (result as { settings: Settings }).settings;
    expect(settings.sqlite._client).toBe(client);
    expect(settings.sqlite._ownedClient).toBe(true);
  });

  it('skips CREATE TABLE when schema=manual', async () => {
    const logger = makeLogger();
    const { client, calls } = makeClientSpy();

    await destinationSQLite.init({
      config: {
        settings: { sqlite: { url: ':memory:', schema: 'manual' } },
        mapping: { page: { view: { name: 'ok' } } },
      },
      env: { client },
      logger,
      id: 'test',
    } as never);

    expect(calls.find((c) => c.kind === 'execute')).toBeUndefined();
    expect(calls.some((c) => c.kind === 'prepare')).toBe(true);
  });

  it('reuses pre-wired _client without creating a new one', async () => {
    const logger = makeLogger();
    const { client } = makeClientSpy();

    const result = await destinationSQLite.init({
      config: {
        settings: { sqlite: { url: ':memory:', _client: client } },
      },
      env: {},
      logger,
      id: 'test',
    } as never);

    const settings = (result as { settings: Settings }).settings;
    expect(settings.sqlite._client).toBe(client);
  });
});

describe('destroy', () => {
  it('closes an owned client and clears references', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const settings: Settings = {
      sqlite: {
        url: ':memory:',
        _client: {
          execute: () => Promise.resolve(),
          prepare: () => () => Promise.resolve(),
          close,
        },
        _ownedClient: true,
      },
    };

    await destinationSQLite.destroy!({ config: { settings } } as never);
    expect(close).toHaveBeenCalledTimes(1);
    expect(settings.sqlite._client).toBeUndefined();
    expect(settings.sqlite._ownedClient).toBeUndefined();
  });

  it('does not close a user-provided client', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const settings: Settings = {
      sqlite: {
        url: ':memory:',
        _client: {
          execute: () => Promise.resolve(),
          prepare: () => () => Promise.resolve(),
          close,
        },
        _ownedClient: false,
      },
    };

    await destinationSQLite.destroy!({ config: { settings } } as never);
    expect(close).not.toHaveBeenCalled();
  });
});

describe('push error handling', () => {
  it('logs and drops on insert failure (does not throw)', async () => {
    const logger = makeLogger();
    const failingClient: SqliteClient = {
      execute: () => Promise.resolve(),
      prepare: () => () => Promise.reject(new Error('disk I/O error')),
      close: () => Promise.resolve(),
    };

    const initResult = await destinationSQLite.init({
      config: { settings: { sqlite: { url: ':memory:' } } },
      env: { client: failingClient },
      logger,
      id: 'test',
    } as never);

    const config = initResult as { settings: Settings };

    await expect(
      destinationSQLite.push(
        {
          name: 'page view',
          entity: 'page',
          action: 'view',
          id: 'evt-x',
          timestamp: 1,
        } as never,
        { config, logger, id: 'test' } as never,
      ),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'SQLite INSERT failed',
      expect.any(Object),
    );
  });
});
