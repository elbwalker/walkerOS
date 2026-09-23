import type { MockLogger } from '@walkeros/core';
import { createMockLogger, getEvent } from '@walkeros/core';
import {
  ClickHouseError,
  __failInsert,
  __getCalls,
  __reset,
  createClient,
} from '../__mocks__/@clickhouse/client';
import {
  MIN_REQUEST_TIMEOUT_MS,
  RETRY_JITTER_MAX,
  resolveInsertSettings,
  resolveRequestTimeout,
  retryDelay,
  retryDelayBudget,
} from '../config';
import { eventToRow } from '../eventToRow';
import type { InsertRow } from '../eventToRow';
import { deduplicationToken, insertRows } from '../insert';
import type { InsertEntry } from '../insert';
import type { ClickHouseClientSurface, Settings } from '../types';

const url = 'https://clickhouse.example.com:8443';

let logger: MockLogger;

/** One entry per id, its row built through the converter the push path uses. */
function entriesFor(...ids: string[]): InsertEntry[] {
  return ids.map((id) => ({
    row: eventToRow(getEvent('page view', { id })),
    id,
  }));
}

/** The rows of a set of entries, as the insert sends them. */
function rowsOf(entries: readonly InsertEntry[]): InsertRow[] {
  return entries.map((entry) => entry.row);
}

function settingsFor(overrides: Partial<Settings> = {}): Settings {
  return {
    url,
    database: 'analytics',
    table: 'events',
    maxRetries: 1,
    clickhouseSettings: resolveInsertSettings(),
    client: createClient({ url }),
    ...overrides,
  };
}

/**
 * A client that fails each attempt with its own error, so a test can tell which
 * of several failures came back out. The package mock repeats one error, which
 * cannot distinguish the first attempt's failure from the last.
 */
function clientFailingWith(...errors: readonly Error[]) {
  const attempts: unknown[] = [];

  const client: ClickHouseClientSurface = {
    async insert(params) {
      const error = errors[attempts.length];
      attempts.push(params);

      if (error) throw error;

      return { executed: true, query_id: 'stub', response_headers: {} };
    },
    async close() {},
  };

  return { attempts, client };
}

/** The parameters of each captured insert, in the order the attempts ran. */
function insertParams(): unknown[] {
  return __getCalls()
    .filter(([name]) => name === 'insert')
    .map(([, params]) => params);
}

/**
 * Drives an insert to its end, draining every retry delay on the way.
 * Resolves to `undefined` when the insert succeeded, or to the rejection.
 */
async function settle(insert: Promise<void>): Promise<unknown> {
  const settled = insert.then(
    () => undefined,
    (reason: unknown) => reason,
  );

  await jest.runAllTimersAsync();

  return settled;
}

beforeEach(() => {
  __reset();
  jest.useFakeTimers();
  logger = createMockLogger();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('insert parameters', () => {
  it('sends the table, the row format, the per-insert settings and the token', async () => {
    const entries = entriesFor('evt-a');

    expect(
      await settle(insertRows(entries, settingsFor({ table: 'hits' }), logger)),
    ).toBeUndefined();

    expect(insertParams()).toEqual([
      {
        table: 'hits',
        values: rowsOf(entries),
        format: 'JSONEachRow',
        clickhouse_settings: {
          async_insert: 0,
          input_format_skip_unknown_fields: 0,
          input_format_null_as_default: 0,
          insert_deduplication_token: deduplicationToken(['evt-a']),
        },
      },
    ]);
  });

  // The settings slot is optional on the type, so nothing but this stops an
  // insert from dropping it. Dropped, the server silently repairs again: an
  // unknown field disappears and an explicit null becomes a column default,
  // with every other test still green.
  it('sends the loud defaults even when the settings carry none', async () => {
    const settings = settingsFor({ clickhouseSettings: undefined });

    await settle(insertRows(entriesFor('evt-a'), settings, logger));

    expect(insertParams()[0]).toMatchObject({
      clickhouse_settings: {
        async_insert: 0,
        input_format_skip_unknown_fields: 0,
        input_format_null_as_default: 0,
      },
    });
  });

  it('keeps a setting a flow added to the insert', async () => {
    const settings = settingsFor({
      clickhouseSettings: resolveInsertSettings({ max_execution_time: 30 }),
    });

    await settle(insertRows(entriesFor('evt-a'), settings, logger));

    expect(insertParams()[0]).toMatchObject({
      clickhouse_settings: { max_execution_time: 30 },
    });
  });

  // A token an operator could pin would turn every insert into the same
  // deduplicated block, and every batch after the first would vanish without an
  // error anywhere.
  it('keeps a pinned token in the passthrough from winning', async () => {
    const settings = settingsFor({
      clickhouseSettings: resolveInsertSettings({
        insert_deduplication_token: 'pinned-by-the-flow',
      }),
    });

    await settle(insertRows(entriesFor('evt-a'), settings, logger));

    expect(insertParams()[0]).toMatchObject({
      clickhouse_settings: {
        insert_deduplication_token: deduplicationToken(['evt-a']),
      },
    });
  });
});

describe('deduplication token', () => {
  it('differs when an id differs', () => {
    expect(deduplicationToken(['evt-a', 'evt-b'])).not.toBe(
      deduplicationToken(['evt-a', 'evt-c']),
    );
  });

  // ClickHouse deduplicates a block by its token, and the same rows in another
  // order are another block. A token blind to the order would drop one of them.
  it('differs when the same ids arrive in another order', () => {
    expect(deduplicationToken(['evt-a', 'evt-b'])).not.toBe(
      deduplicationToken(['evt-b', 'evt-a']),
    );
  });

  // Pinned rather than recomputed from the implementation: a redelivery of the
  // same batch after a deploy has to produce the token the first delivery sent,
  // or ClickHouse sees a new block and writes every row a second time.
  it('is a digest that survives a release', () => {
    expect(deduplicationToken(['evt-a', 'evt-b'])).toBe(
      '745c9afc9d4fd1f51618fd61c81cef16edb87ec6e113f1545ac57c62249fecb4',
    );
  });

  // The ids identify the events; the rows only describe them. A token read off
  // the rows would give every row shape that carries no id of its own the same
  // token, and the server skips a repeated block while reporting success, so
  // every delivery after the first would vanish with no error anywhere.
  it('reads the ids and not the rows', async () => {
    const entries = entriesFor('evt-a');
    const mapped: InsertEntry[] = [{ row: { customer: 'acme' }, id: 'evt-a' }];

    await settle(insertRows(entries, settingsFor(), logger));
    await settle(insertRows(mapped, settingsFor(), logger));

    const [canonical, verbatim] = insertParams();
    const token = deduplicationToken(['evt-a']);

    expect(canonical).toMatchObject({
      clickhouse_settings: { insert_deduplication_token: token },
    });
    expect(verbatim).toMatchObject({
      values: [{ customer: 'acme' }],
      clickhouse_settings: { insert_deduplication_token: token },
    });
  });

  it('sends one token, unchanged, on every attempt of a batch', async () => {
    __failInsert(2, { code: '159' });

    await settle(
      insertRows(
        entriesFor('evt-a', 'evt-b'),
        settingsFor({ maxRetries: 2 }),
        logger,
      ),
    );

    const attempts = insertParams();
    expect(attempts).toHaveLength(3);

    for (const params of attempts)
      expect(params).toMatchObject({
        clickhouse_settings: {
          insert_deduplication_token: deduplicationToken(['evt-a', 'evt-b']),
        },
      });
  });
});

describe('retry', () => {
  it('retries a transient failure and lands on a later attempt', async () => {
    __failInsert(1, { code: '159' });

    expect(
      await settle(insertRows(entriesFor('evt-a'), settingsFor(), logger)),
    ).toBeUndefined();
    expect(insertParams()).toHaveLength(2);
  });

  it('retries a failure carrying no clickhouse code', async () => {
    __failInsert(1);

    expect(
      await settle(insertRows(entriesFor('evt-a'), settingsFor(), logger)),
    ).toBeUndefined();
    expect(insertParams()).toHaveLength(2);
  });

  // The failure class the retry exists for: a keep-alive dropped by a
  // restarting node arrives with a Node errno and no code from the server, and
  // reading that errno as a ClickHouse code would dead-letter the batch.
  it('retries a socket failure carrying a node errno', async () => {
    __failInsert(1, { code: 'ECONNRESET', message: 'socket hang up' });

    expect(
      await settle(insertRows(entriesFor('evt-a'), settingsFor(), logger)),
    ).toBeUndefined();
    expect(insertParams()).toHaveLength(2);
  });

  it('gives up after maxRetries and throws the failure the last attempt ended on', async () => {
    const { attempts, client } = clientFailingWith(
      new ClickHouseError({ code: '159', message: 'first' }),
      new ClickHouseError({ code: '159', message: 'second' }),
      new ClickHouseError({ code: '159', message: 'third' }),
    );

    const error = await settle(
      insertRows(
        entriesFor('evt-a'),
        settingsFor({ client, maxRetries: 2 }),
        logger,
      ),
    );

    expect(attempts).toHaveLength(3);
    // The code travels with the error so the dead letter entry stays readable.
    expect(error).toMatchObject({ code: '159', message: 'third' });
  });

  it('stops at the first attempt on a terminal failure', async () => {
    __failInsert(1, { code: '16', message: 'no such column' });

    const error = await settle(
      insertRows(entriesFor('evt-a'), settingsFor({ maxRetries: 3 }), logger),
    );

    expect(insertParams()).toHaveLength(1);
    expect(error).toMatchObject({ code: '16' });
  });

  it('makes a single attempt when the flow allows no retry', async () => {
    __failInsert(1, { code: '159' });

    const error = await settle(
      insertRows(entriesFor('evt-a'), settingsFor({ maxRetries: 0 }), logger),
    );

    expect(insertParams()).toHaveLength(1);
    expect(error).toMatchObject({ code: '159' });
  });

  // `attempt >= NaN` and `attempt >= Infinity` are false forever, so an
  // unclamped bound would keep hammering a live server in the background: the
  // collector stops waiting for a destination but never cancels its work. The
  // settings schema does not protect this, the defaults helper runs no schema.
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'makes a single attempt on a retry count of %p',
    async (maxRetries) => {
      __failInsert(2, { code: '159' });

      const error = await settle(
        insertRows(entriesFor('evt-a'), settingsFor({ maxRetries }), logger),
      );

      expect(insertParams()).toHaveLength(1);
      expect(error).toMatchObject({ code: '159' });
    },
  );

  // A finite but absurd count passes the clamp, and here that would be spent on
  // insert attempts against a live server rather than on cheap additions.
  it('stops retrying when the delays leave the finite range', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    __failInsert(Number.MAX_SAFE_INTEGER, { code: '159' });

    // The first retry whose delay is no longer finite, found with the same
    // function the loop waits on rather than a count restated here.
    let overflow = 0;
    while (Number.isFinite(retryDelay(overflow))) overflow += 1;

    const error = await settle(
      insertRows(
        entriesFor('evt-a'),
        settingsFor({ maxRetries: 1e15 }),
        logger,
      ),
    );

    expect(insertParams()).toHaveLength(overflow + 1);
    expect(error).toMatchObject({ code: '159' });
  }, 15_000);

  it('rounds a fractional retry count down', async () => {
    __failInsert(2, { code: '159' });

    await settle(
      insertRows(entriesFor('evt-a'), settingsFor({ maxRetries: 1.9 }), logger),
    );

    expect(insertParams()).toHaveLength(2);
  });

  it('warns once per retry with the code it saw', async () => {
    __failInsert(1, { code: '209' });

    await settle(insertRows(entriesFor('evt-a'), settingsFor(), logger));

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ code: '209' }),
    );
  });

  // The advice is what an operator acts on, so it has to reach them even where
  // there was never a retry to skip.
  it('gives the operator guidance with no retry left to skip', async () => {
    __failInsert(1, { code: '252' });

    await settle(
      insertRows(entriesFor('evt-a'), settingsFor({ maxRetries: 0 }), logger),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('config.batch.size'),
      { code: '252' },
    );
  });
});

describe('retry delay', () => {
  it.each([
    ['its shortest', 0, 1],
    ['its longest', 1, RETRY_JITTER_MAX],
  ])(
    'doubles the base delay per retry at %s jitter',
    async (_draw, random, jitter) => {
      jest.spyOn(Math, 'random').mockReturnValue(random);
      __failInsert(2, { code: '159' });

      const pending = insertRows(
        entriesFor('evt-a'),
        settingsFor({ maxRetries: 2 }),
        logger,
      ).then(
        () => undefined,
        (reason: unknown) => reason,
      );

      await jest.advanceTimersByTimeAsync(0);
      expect(insertParams()).toHaveLength(1);

      await jest.advanceTimersByTimeAsync(retryDelay(0, jitter) - 1);
      expect(insertParams()).toHaveLength(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(insertParams()).toHaveLength(2);

      await jest.advanceTimersByTimeAsync(retryDelay(1, jitter) - 1);
      expect(insertParams()).toHaveLength(2);

      await jest.advanceTimersByTimeAsync(1);
      expect(insertParams()).toHaveLength(3);

      // The warn names the delay this attempt actually waited, which the
      // timers above just pinned, rather than the unjittered schedule. At the
      // shortest draw the two are different numbers, so a line that logged the
      // schedule would send an operator looking for a wait that never happened.
      expect(logger.warn).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({ attempt: 0, delay: retryDelay(0, jitter) }),
      );
      expect(logger.warn).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.objectContaining({ attempt: 1, delay: retryDelay(1, jitter) }),
      );

      expect(await pending).toBeUndefined();
    },
  );

  it('never waits longer than the budget the request timeout was derived from', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    __failInsert(3, { code: '159' });

    const started = Date.now();
    await settle(
      insertRows(entriesFor('evt-a'), settingsFor({ maxRetries: 2 }), logger),
    );

    expect(Date.now() - started).toBe(retryDelayBudget(2));
  });

  // The invariant is conditional: it holds only while the derived per-attempt
  // timeout is above its floor.
  it('keeps the delays it waits plus every attempt inside the collector timeout, above the floor', async () => {
    const timeout = 10_000;
    const maxRetries = 2;
    const perAttempt = resolveRequestTimeout(timeout, maxRetries);

    expect(perAttempt).toBeGreaterThan(MIN_REQUEST_TIMEOUT_MS);

    jest.spyOn(Math, 'random').mockReturnValue(1);
    __failInsert(maxRetries + 1, { code: '159' });

    const started = Date.now();
    await settle(
      insertRows(entriesFor('evt-a'), settingsFor({ maxRetries }), logger),
    );
    const waited = Date.now() - started;

    expect(waited + perAttempt * (maxRetries + 1)).toBeLessThanOrEqual(timeout);
  });

  // Below the floor the sum deliberately exceeds the collector timeout: a
  // sub-second per-attempt timeout is useless, and the collector's own race is
  // what cuts the later attempts off.
  it('lets the floor win over the collector timeout when the retries cannot fit it', () => {
    const timeout = 10_000;
    const maxRetries = 10;
    const perAttempt = resolveRequestTimeout(timeout, maxRetries);

    expect(perAttempt).toBe(MIN_REQUEST_TIMEOUT_MS);
    expect(
      retryDelayBudget(maxRetries) + perAttempt * (maxRetries + 1),
    ).toBeGreaterThan(timeout);
  });
});
