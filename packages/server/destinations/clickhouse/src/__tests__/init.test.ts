import type { ClickHouseClientConfigOptions } from '@clickhouse/client';
import type { MockLogger } from '@walkeros/core';
import { createMockContext, createMockLogger } from '@walkeros/core';
import { __getCalls, __reset } from '../__mocks__/@clickhouse/client';
import destination from '../';
import type {
  ClickHouseClientSurface,
  Credentials,
  Env,
  PartialConfig,
} from '../types';

const id = 'clickhouse';
const url = 'https://clickhouse.example.com:8443';

const credentials: Credentials = {
  username: 'walkeros_writer',
  password: 'super-secret-password',
};

type DestroyContext = Parameters<NonNullable<typeof destination.destroy>>[0];

/**
 * A client the package-local mock never sees, so a test can tell the injected
 * factory apart from the module-level one by which capture array moved.
 */
function createStub() {
  const close = jest.fn(async (): Promise<void> => {});
  const options: ClickHouseClientConfigOptions[] = [];

  const client: ClickHouseClientSurface = {
    async insert() {
      return { executed: true, query_id: 'stub', response_headers: {} };
    },
    close,
  };

  const env: Env = {
    ClickHouseClient: (config) => {
      options.push(config);
      return client;
    },
  };

  return { client, close, env, options };
}

function initContext(config: PartialConfig, env: Env, logger?: MockLogger) {
  return createMockContext({ config, env, id, ...(logger && { logger }) });
}

async function init(config: PartialConfig, env: Env, logger?: MockLogger) {
  const resolved = await destination.init(initContext(config, env, logger));

  if (!resolved) throw new Error('init must return the resolved config');

  return resolved;
}

function destroyDestination(context: DestroyContext) {
  const { destroy } = destination;

  if (!destroy) throw new Error('the destination must export a destroy');

  return destroy(context);
}

beforeEach(() => {
  __reset();
});

describe('init', () => {
  it('applies the documented defaults', async () => {
    const { env } = createStub();
    const config = await init({ settings: { url } }, env);

    expect(config.settings).toMatchObject({
      url,
      database: 'default',
      table: 'events',
      maxRetries: 1,
    });
  });

  it('refuses a url-less config', async () => {
    const { env } = createStub();

    await expect(
      destination.init(initContext({ settings: { url: '' } }, env)),
    ).rejects.toThrow('Config settings url missing');
  });

  it('refuses a config without settings', async () => {
    const { env } = createStub();

    await expect(destination.init(initContext({}, env))).rejects.toThrow(
      'Config settings missing',
    );
  });

  it('queries nothing', async () => {
    const config = await init({ settings: { url } }, {});

    expect(__getCalls().map(([name]) => name)).toEqual(['createClient']);
    expect(config.settings?.client).toBeDefined();
  });
});

describe('client factory', () => {
  it('uses the factory injected through env', async () => {
    const { client, env, options } = createStub();
    const config = await init(
      { settings: { url, database: 'analytics' } },
      env,
    );

    expect(options).toHaveLength(1);
    expect(config.settings?.client).toBe(client);
    // The module-level factory stayed untouched, so the injection is the path
    // that ran and not a mock the test resolver substituted underneath it.
    expect(__getCalls()).toEqual([]);
  });

  it('uses the SDK factory when env carries none', async () => {
    const { client, options } = createStub();
    const config = await init({ settings: { url, database: 'analytics' } }, {});

    expect(options).toEqual([]);
    expect(config.settings?.client).not.toBe(client);
    expect(__getCalls()).toEqual([
      ['createClient', expect.objectContaining({ url, database: 'analytics' })],
    ]);
  });
});

describe('client options', () => {
  async function optionsFor(config: PartialConfig) {
    const { env, options } = createStub();
    await init(config, env);

    const [first] = options;
    if (!first) throw new Error('the factory must receive its options');

    return first;
  }

  it('derives the request timeout from the collector timeout', async () => {
    const options = await optionsFor({ settings: { url }, timeout: 5000 });

    expect(options.request_timeout).toBe(2312);
  });

  it('derives the request timeout from the default collector timeout', async () => {
    const options = await optionsFor({ settings: { url } });

    expect(options.request_timeout).toBe(4812);
  });

  it('shrinks the request timeout as the retry count grows', async () => {
    const options = await optionsFor({ settings: { url, maxRetries: 3 } });

    expect(options.request_timeout).toBe(1843);
  });

  it('yields to an explicit request timeout', async () => {
    const options = await optionsFor({
      settings: { url, clickhouse: { request_timeout: 60000 } },
    });

    expect(options.request_timeout).toBe(60000);
  });

  it('turns request compression on', async () => {
    const options = await optionsFor({ settings: { url } });

    expect(options.compression).toEqual({ request: true });
  });

  it('yields to an explicit compression setting', async () => {
    const options = await optionsFor({
      settings: { url, clickhouse: { compression: { response: true } } },
    });

    expect(options.compression).toEqual({ response: true });
  });

  it('places the credentials as username and password', async () => {
    const options = await optionsFor({ settings: { url }, credentials });

    expect(options).toMatchObject(credentials);
  });

  it('lets the credentials win over the passthrough', async () => {
    const options = await optionsFor({
      settings: {
        url,
        clickhouse: { username: 'passthrough', password: 'weak' },
      },
      credentials,
    });

    expect(options).toMatchObject(credentials);
  });

  it('carries the table nowhere near the client', async () => {
    const options = await optionsFor({ settings: { url, table: 'hits' } });

    expect(options).not.toHaveProperty('table');
  });
});

describe('insert settings', () => {
  it('resolves the loud defaults onto the config', async () => {
    const { env } = createStub();
    const config = await init({ settings: { url } }, env);

    expect(config.settings?.clickhouseSettings).toEqual({
      async_insert: 0,
      input_format_skip_unknown_fields: 0,
      input_format_null_as_default: 0,
    });
  });

  it('lets a flow override one of them', async () => {
    const { env } = createStub();
    const config = await init(
      { settings: { url, clickhouseSettings: { async_insert: 1 } } },
      env,
    );

    expect(config.settings?.clickhouseSettings).toMatchObject({
      async_insert: 1,
      input_format_skip_unknown_fields: 0,
    });
  });
});

describe('credentials', () => {
  const { username, password } = credentials;

  // Every place a credential can legitimately sit. The url row is the one that
  // bites: the client accepts userinfo, so a partner can put a password in the
  // one field that reads like an innocent endpoint.
  const sources: Array<[string, PartialConfig]> = [
    ['the credentials slot', { settings: { url }, credentials }],
    [
      'the clickhouse passthrough',
      { settings: { url, clickhouse: { username, password } } },
    ],
    [
      'the url userinfo',
      {
        settings: {
          url: `https://${username}:${password}@ch.example.com:8443`,
        },
      },
    ],
  ];

  it.each(sources)(
    'never reach a logged object from %s',
    async (_source, config) => {
      const { env } = createStub();
      const logger = createMockLogger();

      await init(config, env, logger);

      const logged = JSON.stringify([
        logger.error.mock.calls,
        logger.warn.mock.calls,
        logger.info.mock.calls,
        logger.debug.mock.calls,
        logger.json.mock.calls,
      ]);

      // The assertion is only worth something while init logs at all.
      expect(logger.debug).toHaveBeenCalled();
      expect(logged).not.toContain(password);
      expect(logged).not.toContain(username);
    },
  );
});

describe('destroy', () => {
  it('closes the client', async () => {
    const { close, env } = createStub();
    const config = await init({ settings: { url } }, env);

    await destroyDestination({ id, config, env, logger: createMockLogger() });

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the client once when called twice', async () => {
    const { close, env } = createStub();
    const config = await init({ settings: { url } }, env);
    const context = { id, config, env, logger: createMockLogger() };

    await destroyDestination(context);
    await destroyDestination(context);

    // The SDK documents close as a call to make once per lifecycle, so the
    // second destroy has to stop at the released handle.
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does nothing when init never ran', async () => {
    await expect(
      destroyDestination({
        id,
        config: {},
        env: {},
        logger: createMockLogger(),
      }),
    ).resolves.toBeUndefined();
  });

  it('sends nothing on the way out', async () => {
    const config = await init({ settings: { url } }, {});
    __reset();

    await destroyDestination({
      id,
      config,
      env: {},
      logger: createMockLogger(),
    });

    // The collector flushes every batch before destroy, so closing is the
    // whole job: an insert here would be a second, unaccounted flush.
    expect(__getCalls().map(([name]) => name)).toEqual(['close']);
  });
});
