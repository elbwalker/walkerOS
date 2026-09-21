import type { MockLogger, WalkerOS } from '@walkeros/core';
import { createMockContext, createMockLogger, getEvent } from '@walkeros/core';
import { __failInsert, __reset } from '../__mocks__/@clickhouse/client';
import destination from '../';
import { eventToRow } from '../eventToRow';
import { deduplicationToken } from '../insert';
import type { PartialConfig } from '../types';
import {
  env,
  id,
  initialized,
  insertCalls,
  insertTokens,
  insertedRows,
  isRecord,
  url,
} from './support';

let logger: MockLogger;

function bootstrap(config?: PartialConfig) {
  return initialized(logger, config);
}

function pushContext(config: PartialConfig, data?: unknown) {
  return createMockContext({ config, env, id, logger, data });
}

beforeEach(() => {
  __reset();
  logger = createMockLogger();
});

describe('push', () => {
  it('inserts the event as a single row', async () => {
    const event = getEvent('page view');
    const config = await bootstrap();

    await destination.push(event, pushContext(config));

    expect(insertCalls()).toHaveLength(1);
    expect(insertedRows()).toEqual([eventToRow(event)]);
  });

  // The settings a push receives are the ones a user wrote, the client optional
  // and the defaults unapplied, so a push that read them straight off the config
  // would reach the insert with an undefined client.
  it.each([
    ['init never ran', {}, 'Config settings missing'],
    ['init left no client', { settings: { url } }, 'ClickHouse client missing'],
  ])('refuses to insert when %s', async (_case, config, message) => {
    await expect(
      destination.push(getEvent('page view'), pushContext(config)),
    ).rejects.toThrow(message);

    expect(insertCalls()).toHaveLength(0);
  });
});

describe('mapped row', () => {
  const mapped = { customer: 'acme', hits: 1 };

  // A flow that mapped the event puts the row it wants in `data`, and it
  // replaces the canonical shape wholesale: a partner whose table is not the
  // reference DDL configures its columns in the flow, and a destination that
  // converted the event anyway would silently ignore that configuration.
  it('sends the mapped object verbatim', async () => {
    const config = await bootstrap();

    await destination.push(getEvent('page view'), pushContext(config, mapped));

    expect(insertedRows()).toEqual([mapped]);
  });

  // Everything that is not an object means no mapping produced a row.
  it.each([
    ['nothing', undefined],
    ['a string', 'mapped'],
    ['a number', 1],
    ['a boolean', true],
    ['an array', [{ customer: 'acme' }]],
  ])('converts the event when the mapping produced %s', async (_case, data) => {
    const event = getEvent('page view');
    const config = await bootstrap();

    await destination.push(event, pushContext(config, data));

    expect(insertedRows()).toEqual([eventToRow(event)]);
  });
});

describe('deduplication token', () => {
  // The server deduplicates on this token INSTEAD of the block contents and
  // skips a repeated block while reporting success, so two pushes that share a
  // token are one push with no throw, no error line, no dead letter entry and
  // no counter: the second event is simply gone.
  //
  // A mapped row is whatever the flow wrote and need not carry an `id` column,
  // so a token read off the row would be one constant for every id-less mapped
  // event. The identical-bodies row is the second half of the same rule: two
  // different events that a mapping shaped the same way are still two events,
  // which a digest over the row contents would collapse.
  it.each([
    ['different bodies', { customer: 'acme' }, { customer: 'globex' }],
    ['identical bodies', { customer: 'acme' }, { customer: 'acme' }],
  ])(
    'gives two id-less mapped events different tokens with %s',
    async (_case, first, second) => {
      const config = await bootstrap();

      await destination.push(
        getEvent('page view', { id: 'evt-a' }),
        pushContext(config, first),
      );
      await destination.push(
        getEvent('page view', { id: 'evt-b' }),
        pushContext(config, second),
      );

      expect(insertTokens()).toEqual([
        deduplicationToken(['evt-a']),
        deduplicationToken(['evt-b']),
      ]);
    },
  );
});

describe('failure', () => {
  // The collector reads a throw as the delivery failing: it dead-letters the
  // event and records one transport failure against the breaker. A push that
  // swallowed the rejection would report a lost event as delivered.
  it('throws the failure the insert ended on, code included', async () => {
    const config = await bootstrap();
    __failInsert(1, { code: '16', message: 'no such column' });

    await expect(
      destination.push(getEvent('page view'), pushContext(config)),
    ).rejects.toMatchObject({ code: '16', message: 'no such column' });
  });

  it('logs the failure at error with the code and the row count', async () => {
    const config = await bootstrap();
    __failInsert(1, { code: '16' });

    await expect(
      destination.push(getEvent('page view'), pushContext(config)),
    ).rejects.toBeDefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ code: '16', rows: 1 }),
    );
  });

  // A transport failure carries a Node errno, which is not a ClickHouse code
  // and is deliberately not read as one, so the code is absent for exactly the
  // failure class the retry exists for. The message is what is left to grep.
  it('names a codeless transport failure in the error line', async () => {
    // A transport failure is retryable, so the retries are turned off here to
    // reach the error line without waiting out a delay.
    const config = await bootstrap({ settings: { url, maxRetries: 0 } });
    __failInsert(1, { code: 'ECONNRESET', message: 'socket hang up' });

    await expect(
      destination.push(getEvent('page view'), pushContext(config)),
    ).rejects.toBeDefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ code: undefined, message: 'socket hang up' }),
    );
  });

  // One line per delivery at debug, and nothing at a level an operator watches:
  // a destination that logged every landed event at info drowns the one that
  // did not.
  it('stays at debug when the insert lands', async () => {
    const config = await bootstrap();

    await destination.push(getEvent('page view'), pushContext(config));

    expect(logger.debug).toHaveBeenCalledWith(expect.any(String), { rows: 1 });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe('wire format', () => {
  const empty: WalkerOS.DeepPartialEvent = {
    data: {},
    context: {},
    globals: {},
    custom: {},
    user: {},
    nested: [],
    consent: {},
  };

  // Inserts run with `input_format_null_as_default = 0`, so a single null in the
  // body loses the whole batch. The row type forbids null as a value, but the
  // wire is JSON and nothing between the converter and the socket reads the
  // serialized body: an absent payload has to arrive as an empty string, never
  // as a null the server will reject.
  it.each([
    ['a full event', getEvent('order complete')],
    ['an event carrying no payload at all', getEvent('page view', empty)],
  ])('serializes %s without a null', async (_case, event) => {
    const config = await bootstrap();

    await destination.push(event, pushContext(config));

    const rows = insertedRows();
    expect(rows).toHaveLength(1);

    for (const row of rows) {
      const serialized: unknown = JSON.parse(JSON.stringify(row));

      if (!isRecord(serialized))
        throw new Error('a row serializes to an object');

      expect(Object.values(serialized)).not.toContain(null);
    }
  });

  // A non-finite timing is the one value that still reaches the wire as a null,
  // and it travels unrepaired on purpose: the server rejects the whole batch
  // loudly, where a `0` fallback would write a plausible wrong number into the
  // partner's warehouse and nobody would ever look.
  it('sends a non-finite timing unchanged', async () => {
    const config = await bootstrap();

    await destination.push(
      getEvent('page view', { timing: Number.NaN }),
      pushContext(config),
    );

    expect(insertedRows()).toEqual([
      expect.objectContaining({ timing: Number.NaN }),
    ]);
  });
});
