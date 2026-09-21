import type { Destination as CoreDestination } from '@walkeros/core';
import { createMockContext, getEvent } from '@walkeros/core';
import { createClient } from '../__mocks__/@clickhouse/client';
import { SettingsSchema } from '../schemas';
import type {
  ClickHouseClientSurface,
  Config,
  Credentials,
  InitFn,
  PushBatchFn,
  PushFn,
  Settings,
  Types,
} from '../types';

const url = 'https://clickhouse.example.com:8443';
const id = 'clickhouse';

describe('settings schema', () => {
  it('rejects settings without a url', () => {
    const result = SettingsSchema.safeParse({ database: 'analytics' });

    expect(result.success).toBe(false);
  });

  it('applies the documented defaults', () => {
    expect(SettingsSchema.parse({ url })).toEqual({
      url,
      database: 'default',
      table: 'events',
      maxRetries: 1,
    });
  });

  it('keeps the passthrough settings as given', () => {
    expect(
      SettingsSchema.parse({
        url,
        clickhouse: { request_timeout: 60000 },
        clickhouseSettings: { async_insert: 1 },
      }),
    ).toMatchObject({
      clickhouse: { request_timeout: 60000 },
      clickhouseSettings: { async_insert: 1 },
    });
  });
});

const credentials: Credentials = {
  username: 'walkeros_writer',
  password: 'secret',
};

const env: CoreDestination.Env<Types> = { ClickHouseClient: createClient };

const settings: Settings = {
  url,
  database: 'analytics',
  table: 'events',
  maxRetries: 1,
  client: createClient({ url, ...credentials }),
};

/**
 * Compile-time fixtures. They assert nothing at runtime; their value is that
 * they stop compiling if the type split breaks. Kept in a test file so the
 * lint and typecheck gates cover them.
 */

/** The resolved settings, client included, are what init() hands forward. */
const initFixture: InitFn = () => ({ settings, credentials, env });

/**
 * The push path does NOT receive the local `Config` alias. Core resolves
 * `Config.settings` from the InitSettings slot, so both the settings object and
 * its client arrive optional and must be guarded before use. This fixture pins
 * that contract: it stops compiling if InitSettings loses its client slot or
 * the client type changes.
 */
const pushFixture: PushFn = async (_event, { config, logger }) => {
  const pushSettings = config.settings;
  if (!pushSettings) return logger.throw('settings missing, init() not run');

  const { client } = pushSettings;
  if (!client) return logger.throw('client missing, init() not run');

  const narrowed: ClickHouseClientSurface = client;
  void narrowed;
};

const pushBatchFixture: PushBatchFn = async (_batch, { config, logger }) => {
  const batchSettings = config.settings;
  if (!batchSettings) return logger.throw('settings missing, init() not run');

  const { client } = batchSettings;
  if (!client) return logger.throw('client missing, init() not run');

  const narrowed: ClickHouseClientSurface = client;
  void narrowed;
};

describe('types', () => {
  it('composes a destination config from the Types bundle', () => {
    const config: Config = { settings, credentials, env };

    expect(config.settings.client).toBe(settings.client);
    expect(Object.keys(config.settings).sort()).toEqual([
      'client',
      'database',
      'maxRetries',
      'table',
      'url',
    ]);
  });

  it('hands the resolved settings from init through to the push path', async () => {
    const resolved = await initFixture(
      createMockContext({ config: {}, env, id }),
    );

    if (!resolved) throw new Error('the init fixture must return a config');

    const event = getEvent('page view');
    const context = createMockContext({ config: resolved, env, id });

    await expect(pushFixture(event, context)).resolves.toBeUndefined();
    await expect(
      pushBatchFixture(
        { key: 'default', entries: [{ event }], events: [event], data: [] },
        context,
      ),
    ).resolves.toBeUndefined();
  });

  it('refuses the push path when init did not run', async () => {
    const context = createMockContext({ config: {}, env, id });

    await expect(pushFixture(getEvent('page view'), context)).rejects.toThrow(
      'settings missing, init() not run',
    );
  });
});
