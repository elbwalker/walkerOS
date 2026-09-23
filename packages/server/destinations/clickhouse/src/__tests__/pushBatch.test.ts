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
  url,
} from './support';

type Batch = Parameters<typeof destination.pushBatch>[0];
type Entry = Batch['entries'][number];

let logger: MockLogger;

function bootstrap(config?: PartialConfig) {
  return initialized(logger, config);
}

function batchContext(config: PartialConfig) {
  return createMockContext({ config, env, id, logger });
}

/** A flushed batch, with the derived views the collector fills in. */
function batchOf(...entries: Entry[]): Batch {
  return {
    key: 'clickhouse',
    entries,
    events: entries.map((entry) => entry.event),
    data: entries.map((entry) => entry.data),
  };
}

function entryOf(event: WalkerOS.Event, data?: Entry['data']): Entry {
  return { event, data };
}

beforeEach(() => {
  __reset();
  logger = createMockLogger();
});

describe('pushBatch', () => {
  const events = [
    getEvent('page view', { id: 'evt-a' }),
    getEvent('product view', { id: 'evt-b' }),
    getEvent('order complete', { id: 'evt-c' }),
  ];

  // One flushed batch is one insert, whatever its size. Rows split across
  // several inserts would each carry their own deduplication token and their
  // own retry, which is the mechanism this destination exists to avoid.
  it('sends the whole batch in a single insert, in entry order', async () => {
    const config = await bootstrap();

    await destination.pushBatch(
      batchOf(...events.map((event) => entryOf(event))),
      batchContext(config),
    );

    expect(insertCalls()).toHaveLength(1);
    expect(insertedRows()).toEqual(events.map(eventToRow));
  });

  it('inserts nothing for an empty batch', async () => {
    const config = await bootstrap();

    await expect(
      destination.pushBatch(batchOf(), batchContext(config)),
    ).resolves.toBeUndefined();

    expect(insertCalls()).toHaveLength(0);
  });

  // Each entry carries its own mapped row, so a batch mixing mapped and
  // unmapped events keeps both, at their own positions.
  it('takes each mapped row verbatim and converts the rest', async () => {
    const mapped = { customer: 'acme' };
    const [first, second] = events;
    const config = await bootstrap();

    await destination.pushBatch(
      batchOf(entryOf(first, mapped), entryOf(second)),
      batchContext(config),
    );

    expect(insertedRows()).toEqual([mapped, eventToRow(second)]);
  });

  it.each([
    ['init never ran', {}, 'Config settings missing'],
    ['init left no client', { settings: { url } }, 'ClickHouse client missing'],
  ])('refuses to insert when %s', async (_case, config, message) => {
    await expect(
      destination.pushBatch(batchOf(entryOf(events[0])), batchContext(config)),
    ).rejects.toThrow(message);

    expect(insertCalls()).toHaveLength(0);
  });

  // The batch token is the ids of its events, in entry order. Read off the rows
  // it would be one constant for every batch of identically mapped, id-less
  // rows, and the server skips a repeated block while reporting success: every
  // batch after the first would vanish with no error anywhere.
  it('takes the batch token from the event ids, not the mapped rows', async () => {
    const mapped = { customer: 'acme' };
    const [first, second] = events;
    const config = await bootstrap();

    await destination.pushBatch(
      batchOf(entryOf(first, mapped), entryOf(second, mapped)),
      batchContext(config),
    );

    expect(insertTokens()).toEqual([deduplicationToken(['evt-a', 'evt-b'])]);
  });
});

describe('whole-batch failure', () => {
  const entries = [
    entryOf(getEvent('page view', { id: 'evt-a' })),
    entryOf(getEvent('order complete', { id: 'evt-b' })),
  ];

  // A ClickHouse insert succeeds or fails as a whole and names no row, so the
  // per-row outcome the collector also accepts would have to claim every index.
  // The collector records neither a success nor a failure for an outcome where
  // nothing succeeded, so reporting one would hide a total outage from the
  // breaker. The whole batch has to throw.
  it('throws the failure rather than reporting it as an outcome', async () => {
    const config = await bootstrap();
    __failInsert(1, { code: '16', message: 'no such column' });

    await expect(
      destination.pushBatch(batchOf(...entries), batchContext(config)),
    ).rejects.toMatchObject({ code: '16', message: 'no such column' });
  });

  it('resolves undefined when the insert lands', async () => {
    const config = await bootstrap();

    await expect(
      destination.pushBatch(batchOf(...entries), batchContext(config)),
    ).resolves.toBeUndefined();
  });

  it('logs the failure at error with the code and the row count', async () => {
    const config = await bootstrap();
    __failInsert(1, { code: '16' });

    await expect(
      destination.pushBatch(batchOf(...entries), batchContext(config)),
    ).rejects.toBeDefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ code: '16', rows: entries.length }),
    );
  });

  it('stays at debug when the insert lands', async () => {
    const config = await bootstrap();

    await destination.pushBatch(batchOf(...entries), batchContext(config));

    expect(logger.debug).toHaveBeenCalledWith(expect.any(String), {
      rows: entries.length,
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
