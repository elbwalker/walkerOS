import type { Logger, WalkerOS } from '@walkeros/core';
import {
  Level,
  StepError,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import type { MockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import storeApiDefault, { storeApiInit } from '..';

type InitContext = Parameters<typeof storeApiInit>[0];
type InitConfig = InitContext['config'];

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const URL_PATH = 'https://crm.test/customers/{key}';
const TOKEN = 't0k3n';

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** A fetch that records each request and answers it with `answer`. */
function mockFetch(
  answer: (url: string, init?: RequestInit) => Promise<Response> | Response,
) {
  const calls: FetchCall[] = [];
  const fn: typeof fetch = async (input, init) => {
    const url = urlOf(input);
    calls.push({ url, init });
    return answer(url, init);
  };
  return { fn, calls };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const record = { ltv: 420, segment: 'loyal' };

async function createStore(config: InitConfig, fetchFn?: typeof fetch) {
  const logger = createMockLogger();
  const store = await storeApiInit({
    collector: createMockContext().collector,
    logger,
    id: 'crm',
    config,
    env: fetchFn ? { fetch: fetchFn } : {},
  });
  return { store, logger };
}

/** Every call on the mock logger, scoped loggers included. */
function logCalls(logger: MockLogger): unknown[][] {
  const levels = [logger.error, logger.warn, logger.info, logger.debug];
  return [
    ...levels.flatMap((fn) => fn.mock.calls),
    ...logger.scopedLoggers.flatMap(logCalls),
  ];
}

async function caught(run: () => unknown): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('storeApiInit', () => {
  it('reads and parses a record', async () => {
    const { fn, calls } = mockFetch(() => json(record));
    const { store } = await createStore(
      { settings: { url: URL_PATH }, credentials: { token: TOKEN } },
      fn,
    );

    expect(await store.get('cust-42')).toEqual(record);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://crm.test/customers/cust-42');
    expect(calls[0].init).toMatchObject({
      method: 'GET',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer t0k3n',
      },
    });
  });

  it('fills a query placeholder', async () => {
    const { fn, calls } = mockFetch(() => json(record));
    const { store } = await createStore(
      { settings: { url: 'https://crm.test/customers?id={key}' } },
      fn,
    );

    expect(await store.get('cust-42')).toEqual(record);
    expect(calls[0].url).toBe('https://crm.test/customers?id=cust-42');
  });

  it.each([
    ['a/b', 'a%2Fb'],
    ['a?b', 'a%3Fb'],
    ['a#b', 'a%23b'],
    ['50%', '50%25'],
    ['a b', 'a%20b'],
    ['ü', '%C3%BC'],
  ])('encodes the key as one segment: %s', async (key, encoded) => {
    const { fn, calls } = mockFetch(() => json(record));
    const { store } = await createStore({ settings: { url: URL_PATH } }, fn);

    await store.get(key);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://crm.test/customers/${encoded}`);
  });

  it.each(['', '.', '..', 'a/../b', 'a\\..'])(
    'rejects a key with a dot segment without a request: %j',
    async (key) => {
      const { fn, calls } = mockFetch(() => json(record));
      const { store, logger } = await createStore(
        { settings: { url: URL_PATH } },
        fn,
      );

      expect(await store.get(key)).toBeUndefined();
      expect(calls).toHaveLength(0);
      expect(logger.debug).toHaveBeenCalledTimes(1);
      const lines = logCalls(logger);
      // A message only: no context that could carry the key.
      expect(lines.every((args) => args.length === 1)).toBe(true);
      if (key) expect(JSON.stringify(lines)).not.toContain(key);
    },
  );

  it.each([
    ['404', () => json({ error: 'Not found' }, 404)],
    ['204', () => new Response(null, { status: 204 })],
    ['a null body', () => new Response('null', { status: 200 })],
  ])('treats %s as a miss', async (_name, answer) => {
    const { fn } = mockFetch(answer);
    const { store } = await createStore({ settings: { url: URL_PATH } }, fn);

    expect(await store.get('cust-42')).toBeUndefined();
  });

  it.each([401, 403, 429, 500, 503])(
    'throws on any other status: %i',
    async (status) => {
      const { fn } = mockFetch(() => json({ error: 'nope' }, status));
      const { store } = await createStore({ settings: { url: URL_PATH } }, fn);

      const error = await caught(() => store.get('cust-42'));
      expect(error).toBeInstanceOf(StepError);
      expect(error).toMatchObject({
        code: 'transport',
        status,
        message: `API read failed (HTTP ${status})`,
      });
    },
  );

  it.each([
    ['an empty body', ''],
    ['HTML', '<html><body>Sign in</body></html>'],
  ])('throws on a body that does not parse: %s', async (_name, body) => {
    const { fn } = mockFetch(() => new Response(body, { status: 200 }));
    const { store } = await createStore({ settings: { url: URL_PATH } }, fn);

    const error = await caught(() => store.get('cust-42'));
    expect(error).toBeInstanceOf(StepError);
    expect(error).toMatchObject({
      code: 'decode',
      message: 'API value could not be decoded',
    });
  });

  it.each([
    [
      'a network error',
      (): Promise<Response> => Promise.reject(new TypeError('fetch failed')),
    ],
    [
      'a timeout',
      (_url: string, init?: RequestInit): Promise<Response> => {
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return Promise.reject(new DOMException('timeout', 'TimeoutError'));
      },
    ],
    [
      // fetch follows a redirect unless told not to; the redirect target
      // would then answer with someone else's data.
      'a redirect',
      (_url: string, init?: RequestInit): Promise<Response> =>
        init?.redirect === 'error'
          ? Promise.reject(new TypeError('fetch failed'))
          : Promise.resolve(json({ ltv: 999999 })),
    ],
  ])('throws on %s', async (_name, answer) => {
    const { fn } = mockFetch(answer);
    const { store } = await createStore({ settings: { url: URL_PATH } }, fn);

    const error = await caught(() => store.get('cust-42'));
    expect(error).toBeInstanceOf(StepError);
    expect(error).toMatchObject({
      code: 'transport',
      message: 'API request failed',
    });
  });

  it.each<[string, InitConfig]>([
    ['no url', {}],
    ['a relative url', { settings: { url: '/customers/{key}' } }],
    ['an ftp url', { settings: { url: 'ftp://crm.test/customers/{key}' } }],
    ['no {key}', { settings: { url: 'https://crm.test/customers' } }],
    [
      'two {key}',
      { settings: { url: 'https://crm.test/customers/{key}/{key}' } },
    ],
    ['{key} in the host', { settings: { url: 'https://{key}.crm.test/' } }],
    ['{key} glued to the host', { settings: { url: 'https://crm.test{key}' } }],
    [
      '{key} in the fragment',
      { settings: { url: 'https://crm.test/customers#{key}' } },
    ],
    [
      'credentials an empty string',
      { settings: { url: URL_PATH }, credentials: '' },
    ],
    [
      'credentials a bare string',
      { settings: { url: URL_PATH }, credentials: TOKEN },
    ],
    [
      'credentials with an empty token',
      { settings: { url: URL_PATH }, credentials: { token: '' } },
    ],
    ['file: true', { settings: { url: URL_PATH }, file: true }],
  ])('refuses a bad configuration at init: %s', async (_name, config) => {
    const { fn, calls } = mockFetch(() => json(record));

    const error = await caught(() => createStore(config, fn));
    expect(error).toBeInstanceOf(StepError);
    expect(error).toMatchObject({ code: 'config' });
    expect(calls).toHaveLength(0);
  });

  it('sends no Authorization header without credentials', async () => {
    const { fn, calls } = mockFetch(() => json(record));
    const { store } = await createStore({ settings: { url: URL_PATH } }, fn);

    await store.get('cust-42');
    expect(calls[0].init?.headers).toEqual({ Accept: 'application/json' });
  });

  it('is read-only', async () => {
    const { fn, calls } = mockFetch(() => json(record));
    const { store } = await createStore({ settings: { url: URL_PATH } }, fn);

    for (const run of [
      () => store.set('cust-42', record),
      () => store.delete('cust-42'),
    ]) {
      const error = await caught(run);
      expect(error).toBeInstanceOf(StepError);
      expect(error).toMatchObject({
        code: 'config',
        message: 'API store is read-only',
      });
    }
    expect(calls).toHaveLength(0);
  });

  it('never logs the token', async () => {
    const answers: Array<() => Promise<Response>> = [
      async () => json(record),
      async () => json({ error: 'nope' }, 401),
      async () => new Response('<html>', { status: 200 }),
      () => Promise.reject(new TypeError('fetch failed')),
    ];
    let index = 0;
    const { fn } = mockFetch(() => answers[index++ % answers.length]());
    const { store, logger } = await createStore(
      { settings: { url: URL_PATH }, credentials: { token: TOKEN } },
      fn,
    );

    const errors: unknown[] = [];
    for (const key of ['cust-1', 'cust-2', 'cust-3', 'cust-4', '..'])
      errors.push(await caught(() => store.get(key)));
    errors.push(await caught(() => store.set('cust-1', record)));

    expect(JSON.stringify(logCalls(logger))).not.toContain(TOKEN);
    for (const error of errors)
      if (error instanceof Error) expect(error.message).not.toContain(TOKEN);
  });

  it.each<[string, () => Promise<Response>, Record<string, unknown>]>([
    [
      'a refused read (401)',
      async () => json({ error: 'nope' }, 401),
      { code: 'transport', status: 401 },
    ],
    [
      'a failed request',
      () => Promise.reject(new TypeError('fetch failed')),
      { code: 'transport' },
    ],
    [
      'a body that does not parse',
      async () => new Response('<html>', { status: 200 }),
      { code: 'decode' },
    ],
  ])(
    'reports %s through a real collector and the event goes on',
    async (_name, answer, cause) => {
      const { fn, calls } = mockFetch(answer);
      const lines: Array<{
        level: Level;
        message: string;
        context: Logger.LogContext;
      }> = [];
      const handler: Logger.Handler = (level, message, context) => {
        lines.push({ level, message, context });
      };
      const delivered: WalkerOS.Event[] = [];

      const { elb } = await startFlow({
        logger: { level: 'DEBUG', handler },
        stores: {
          crm: {
            code: storeApiInit,
            config: {
              settings: { url: URL_PATH },
              credentials: { token: TOKEN },
            },
            env: { fetch: fn },
          },
        },
        transformers: {
          loadUser: {
            state: {
              mode: 'get',
              store: 'crm',
              key: 'event.user.id',
              value: 'event.user',
              mapping: { map: { ltv: 'ltv' } },
            },
          },
        },
        destinations: {
          spy: {
            before: 'loadUser',
            code: {
              type: 'spy',
              config: {},
              push: async (event: WalkerOS.Event) => {
                delivered.push(event);
              },
            },
          },
        },
      });

      const first = await elb({
        name: 'order complete',
        user: { id: 'cust-42' },
      });
      await elb({ name: 'order complete', user: { id: 'cust-42' } });

      expect(first.ok).toBe(true);
      expect(calls).toHaveLength(2);
      expect(delivered).toHaveLength(2);
      for (const event of delivered) {
        expect(event.user.id).toBe('cust-42');
        expect(event.user).not.toHaveProperty('ltv');
      }

      const errors = lines.filter(
        ({ level, context }) =>
          level === Level.ERROR && context.step === 'store.crm',
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].context).toMatchObject(cause);
      expect(JSON.stringify(errors)).not.toContain('cust-42');
      expect(JSON.stringify(lines)).not.toContain(TOKEN);
    },
  );

  it('stops the flow at startup on a bad configuration', async () => {
    const error = await caught(() =>
      startFlow({
        stores: {
          crm: {
            code: storeApiInit,
            config: { settings: { url: 'https://{key}.crm.test/' } },
          },
        },
      }),
    );
    expect(error).toBeInstanceOf(StepError);
    expect(error).toMatchObject({ code: 'config' });
  });

  it('default export is the init function', async () => {
    expect(storeApiDefault).toBe(storeApiInit);
    const { fn } = mockFetch(() => json(record));
    const store = await storeApiDefault({
      collector: createMockContext().collector,
      logger: createMockLogger(),
      id: 'crm',
      config: { settings: { url: URL_PATH } },
      env: { fetch: fn },
    });
    expect(store.type).toBe('api');
    expect(await store.get('cust-42')).toEqual(record);
  });
});
