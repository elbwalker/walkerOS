import type { Collector, Logger, WalkerOS } from '@walkeros/core';
import { Level } from '@walkeros/core';
import { startFlow } from '../flow';

interface LogRecord {
  level: Level;
  message: string;
  context: Logger.LogContext;
}

/**
 * A real collector whose emitted log records are captured through the public
 * logger handler, so assertions read actual output instead of a mock's shape.
 * WARN level keeps both warns and errors visible.
 */
async function createTestCollector(
  records: LogRecord[],
): Promise<Collector.Instance> {
  const { collector } = await startFlow({
    logger: {
      level: Level.WARN,
      handler: (level, message, context) => {
        records.push({ level, message, context });
      },
    },
  });

  return collector;
}

const invalidEvents: Array<[WalkerOS.DeepPartialEvent, string]> = [
  [{}, 'Event name is required'],
  [{ name: 'page' }, 'Event name is invalid'],
];

describe('invalid inbound events', () => {
  let records: LogRecord[];

  beforeEach(() => {
    records = [];
  });

  it.each(invalidEvents)(
    'rejects %p as invalid input with the reason',
    async (event, message) => {
      const collector = await createTestCollector(records);

      const result = await collector.push(event, { id: 'web' });

      expect(result).toEqual(
        expect.objectContaining({ ok: false, invalid: true, error: message }),
      );
    },
  );

  it('logs one warn carrying only the reason', async () => {
    const collector = await createTestCollector(records);

    await collector.push({}, { id: 'web' });

    expect(records).toEqual([
      {
        level: Level.WARN,
        message: 'invalid event rejected',
        context: { error: 'Event name is required' },
      },
    ]);
  });

  it('counts invalid events as source rejections, not failures', async () => {
    const collector = await createTestCollector(records);

    await collector.push({}, { id: 'web' });
    await collector.push({}, { id: 'web' });

    expect(collector.status.failed).toBe(0);
    expect(collector.status.sources.web?.rejected).toBe(2);
  });

  it('does not count a rejection without a source id', async () => {
    const collector = await createTestCollector(records);

    const result = await collector.push({});

    expect(result.invalid).toBe(true);
    expect(collector.status.sources).toEqual({});
  });

  // A wrong-typed name is client input, not a walkerOS fault. Without the type
  // guard it reaches split() and throws a TypeError, which the push boundary
  // classifies as a pipeline failure: a 500 with a stack instead of a 400.
  it.each([
    ['a number', 1],
    ['an object', {}],
    ['a boolean', true],
  ])('rejects %s name as invalid input', async (_label, name) => {
    const collector = await createTestCollector(records);

    const result = await collector.push({ name } as never, { id: 'web' });

    expect(result.ok).toBe(false);
    expect(result.invalid).toBe(true);
    expect(result.error).toBe('Event name is invalid');
    expect(collector.status.failed).toBe(0);
    expect(collector.status.sources.web?.rejected).toBe(1);
  });

  // Destructuring defaults only fill `undefined`, so an explicit null source
  // reached the dereference below it and threw.
  it('treats a null source as absent rather than crashing', async () => {
    const collector = await createTestCollector(records);

    const result = await collector.push(
      { name: 'page view', source: null } as never,
      { id: 'web' },
    );

    expect(result.ok).toBe(true);
    expect(collector.status.failed).toBe(0);
  });
});
