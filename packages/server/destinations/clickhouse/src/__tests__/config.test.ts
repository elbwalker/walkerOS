import { createMockLogger } from '@walkeros/core';
import {
  DEFAULT_TIMEOUT_MS,
  MIN_REQUEST_TIMEOUT_MS,
  normalizeMaxRetries,
  resolveClientOptions,
  resolveInsertSettings,
  resolveRequestTimeout,
  resolveSettings,
  resolveTimeout,
  retryDelay,
  retryDelayBudget,
} from '../config';
import type { ClickHouseClientSurface, PartialConfig } from '../types';

const url = 'https://clickhouse.example.com:8443';

const client: ClickHouseClientSurface = {
  async insert() {
    return { executed: true, query_id: 'stub', response_headers: {} };
  },
  async close() {},
};

// A config arrives as JSON and reaches these helpers without passing the
// schema, and `JSON.parse('{"maxRetries": 1e999}')` is `Infinity`.
const invalidRetryCounts: Array<[string, number]> = [
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['-Infinity', -Infinity],
  ['a negative count', -1],
];

describe('normalizeMaxRetries', () => {
  it.each(invalidRetryCounts)('reads %s as no retries', (_name, maxRetries) => {
    expect(normalizeMaxRetries(maxRetries)).toBe(0);
  });

  it.each([
    [0, 0],
    [3, 3],
    [2.7, 2],
    [0.9, 0],
  ])('reads %d as %i retries', (maxRetries, expected) => {
    expect(normalizeMaxRetries(maxRetries)).toBe(expected);
  });
});

describe('retry delay', () => {
  // 250 ms doubled per retry, at the longest jitter the loop can draw (x1.5).
  it.each([
    [0, 375],
    [1, 750],
    [2, 1500],
  ])('waits %i ms before retry %i', (retry, expected) => {
    expect(retryDelay(retry)).toBe(expected);
  });

  it.each([
    [0, 1, 250],
    [1, 1, 500],
    [2, 1.25, 1250],
  ])(
    'scales retry %i by a drawn jitter of %d to %i ms',
    (retry, jitter, expected) => {
      expect(retryDelay(retry, jitter)).toBe(expected);
    },
  );
});

describe('retry delay budget', () => {
  it.each([
    [0, 0],
    [1, 375],
    [2, 1125],
    [3, 2625],
  ])('sums the delays of %i retries to %i ms', (maxRetries, expected) => {
    expect(retryDelayBudget(maxRetries)).toBe(expected);
  });

  it('sums the same delays the retry loop waits', () => {
    expect(retryDelayBudget(3)).toBe(
      retryDelay(0) + retryDelay(1) + retryDelay(2),
    );
  });

  it.each(invalidRetryCounts)('spends nothing on %s', (_name, maxRetries) => {
    expect(retryDelayBudget(maxRetries)).toBe(0);
  });

  it('spends only the whole retries of a fractional count', () => {
    expect(retryDelayBudget(2.7)).toBe(retryDelayBudget(2));
  });

  // Without a bound this loops 1e15 times, and inside init that takes the
  // startup path with it. The elapsed check is what makes the bound the
  // assertion rather than the absence of a hang.
  it('returns on a count no loop could finish', () => {
    const started = Date.now();

    expect(retryDelayBudget(1e15)).toBe(Infinity);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('request timeout', () => {
  it.each([
    [10000, 0, 10000],
    [10000, 1, 4812],
    [10000, 2, 2958],
    [10000, 3, 1843],
  ])(
    'splits a %i ms budget across %i retries into %i ms per attempt',
    (timeout, maxRetries, expected) => {
      expect(resolveRequestTimeout(timeout, maxRetries)).toBe(expected);
    },
  );

  // An unusable retry count would otherwise divide by zero or NaN attempts and
  // hand the client a timeout of Infinity or NaN: a hung insert the collector
  // can only end by dead-lettering the batch.
  it.each(invalidRetryCounts)(
    'treats %s as a single attempt',
    (_name, maxRetries) => {
      expect(resolveRequestTimeout(10000, maxRetries)).toBe(10000);
    },
  );

  it('counts only the whole retries of a fractional count', () => {
    expect(resolveRequestTimeout(10000, 2.7)).toBe(
      resolveRequestTimeout(10000, 2),
    );
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['a negative timeout', -1],
  ])('falls back to the default timeout on %s', (_name, timeout) => {
    expect(resolveRequestTimeout(timeout, 1)).toBe(
      resolveRequestTimeout(DEFAULT_TIMEOUT_MS, 1),
    );
  });

  // A configuration whose retries cannot fit its own timeout still gets a
  // usable per-attempt value; the collector's race is what bounds it there.
  it.each([
    [10000, 10],
    [2000, 5],
    [500, 1],
  ])(
    'floors a %i ms budget with %i retries at the minimum',
    (timeout, maxRetries) => {
      expect(resolveRequestTimeout(timeout, maxRetries)).toBe(
        MIN_REQUEST_TIMEOUT_MS,
      );
    },
  );

  it.each([
    [10000, 0],
    [10000, 1],
    [10000, 2],
    [10000, 3],
    [30000, 4],
  ])(
    'keeps every attempt and delay inside a %i ms budget with %i retries',
    (timeout, maxRetries) => {
      const perAttempt = resolveRequestTimeout(timeout, maxRetries);
      const attempts = maxRetries + 1;

      expect(
        retryDelayBudget(maxRetries) + perAttempt * attempts,
      ).toBeLessThanOrEqual(timeout);
    },
  );
});

describe('collector timeout', () => {
  it.each([
    [undefined, DEFAULT_TIMEOUT_MS],
    [NaN, DEFAULT_TIMEOUT_MS],
    [Infinity, DEFAULT_TIMEOUT_MS],
    [-Infinity, DEFAULT_TIMEOUT_MS],
    [-1, DEFAULT_TIMEOUT_MS],
    [0, DEFAULT_TIMEOUT_MS],
    [5000, 5000],
  ])('reads %s as %i ms', (timeout, expected) => {
    expect(resolveTimeout(timeout)).toBe(expected);
  });
});

describe('insert settings', () => {
  it('turns every silent server-side repair off', () => {
    expect(resolveInsertSettings()).toEqual({
      async_insert: 0,
      input_format_skip_unknown_fields: 0,
      input_format_null_as_default: 0,
    });
  });

  it('lets a flow override a default', () => {
    expect(resolveInsertSettings({ async_insert: 1 })).toEqual({
      async_insert: 1,
      input_format_skip_unknown_fields: 0,
      input_format_null_as_default: 0,
    });
  });

  it('keeps a setting the destination does not name', () => {
    expect(resolveInsertSettings({ max_execution_time: 30 })).toMatchObject({
      max_execution_time: 30,
    });
  });

  it('returns a fresh object per call', () => {
    const first = resolveInsertSettings();
    first.async_insert = 1;

    expect(resolveInsertSettings().async_insert).toBe(0);
  });
});

describe('client options', () => {
  const base = {
    url,
    database: 'analytics',
    table: 'events',
    maxRetries: 1,
    clickhouseSettings: resolveInsertSettings(),
  };

  it('derives the request timeout and turns request compression on', () => {
    expect(resolveClientOptions(base, undefined, DEFAULT_TIMEOUT_MS)).toEqual({
      url,
      database: 'analytics',
      request_timeout: 4812,
      compression: { request: true },
    });
  });

  it('yields to an explicit request timeout in the passthrough', () => {
    const options = resolveClientOptions(
      { ...base, clickhouse: { request_timeout: 60000 } },
      undefined,
      DEFAULT_TIMEOUT_MS,
    );

    expect(options.request_timeout).toBe(60000);
  });

  it('yields to an explicit compression setting in the passthrough', () => {
    const options = resolveClientOptions(
      { ...base, clickhouse: { compression: { response: true } } },
      undefined,
      DEFAULT_TIMEOUT_MS,
    );

    expect(options.compression).toEqual({ response: true });
  });

  it('keeps a passthrough option the destination does not name', () => {
    const options = resolveClientOptions(
      { ...base, clickhouse: { max_open_connections: 25 } },
      undefined,
      DEFAULT_TIMEOUT_MS,
    );

    expect(options.max_open_connections).toBe(25);
  });

  it('overrides a url and database left in the passthrough', () => {
    const options = resolveClientOptions(
      {
        ...base,
        clickhouse: {
          url: 'https://other.example.com:8443',
          database: 'other',
        },
      },
      undefined,
      DEFAULT_TIMEOUT_MS,
    );

    expect(options).toMatchObject({ url, database: 'analytics' });
  });

  it('places the credentials as username and password', () => {
    const options = resolveClientOptions(
      base,
      { username: 'walkeros_writer', password: 'secret' },
      DEFAULT_TIMEOUT_MS,
    );

    expect(options).toMatchObject({
      username: 'walkeros_writer',
      password: 'secret',
    });
  });

  it('lets the credentials win over the same keys in the passthrough', () => {
    const options = resolveClientOptions(
      { ...base, clickhouse: { username: 'passthrough', password: 'weak' } },
      { username: 'walkeros_writer', password: 'secret' },
      DEFAULT_TIMEOUT_MS,
    );

    expect(options).toMatchObject({
      username: 'walkeros_writer',
      password: 'secret',
    });
  });

  it('leaves a passthrough credential alone when the slot is empty', () => {
    const options = resolveClientOptions(
      { ...base, clickhouse: { username: 'passthrough', password: 'weak' } },
      undefined,
      DEFAULT_TIMEOUT_MS,
    );

    expect(options).toMatchObject({
      username: 'passthrough',
      password: 'weak',
    });
  });
});

describe('resolveSettings', () => {
  const logger = createMockLogger();

  it('applies the documented defaults', () => {
    const config: PartialConfig = { settings: { url, client } };

    expect(resolveSettings(config, logger)).toEqual({
      url,
      database: 'default',
      table: 'events',
      maxRetries: 1,
      clickhouseSettings: resolveInsertSettings(),
      client,
    });
  });

  it('keeps the values a flow set', () => {
    const config: PartialConfig = {
      settings: {
        url,
        database: 'analytics',
        table: 'hits',
        maxRetries: 3,
        client,
      },
    };

    expect(resolveSettings(config, logger)).toMatchObject({
      database: 'analytics',
      table: 'hits',
      maxRetries: 3,
    });
  });

  it('keeps a zero retry count', () => {
    const config: PartialConfig = {
      settings: { url, maxRetries: 0, client },
    };

    expect(resolveSettings(config, logger).maxRetries).toBe(0);
  });

  it('merges the flow settings under the insert defaults', () => {
    const config: PartialConfig = {
      settings: { url, clickhouseSettings: { async_insert: 1 }, client },
    };

    expect(resolveSettings(config, logger).clickhouseSettings).toEqual({
      async_insert: 1,
      input_format_skip_unknown_fields: 0,
      input_format_null_as_default: 0,
    });
  });

  it('refuses a config without settings', () => {
    expect(() => resolveSettings({}, logger)).toThrow(
      'Config settings missing, init() not run',
    );
  });

  it('refuses settings without a client', () => {
    expect(() => resolveSettings({ settings: { url } }, logger)).toThrow(
      'ClickHouse client missing, init() not run',
    );
  });

  it('refuses settings without a url', () => {
    expect(() =>
      resolveSettings({ settings: { url: '', client } }, logger),
    ).toThrow('Config settings url missing');
  });
});
