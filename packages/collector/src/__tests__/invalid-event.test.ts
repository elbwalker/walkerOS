import type { Collector, Destination, Logger, WalkerOS } from '@walkeros/core';
import { Level } from '@walkeros/core';
import { startFlow } from '../flow';

interface LogRecord {
  level: Level;
  message: string;
  context: Logger.LogContext;
}

/**
 * A real flow whose emitted log records are captured through the public
 * logger handler, so assertions read actual output instead of a mock's shape.
 * WARN level keeps both warns and errors visible. A capture destination
 * records what is delivered.
 */
async function createTestFlow(records: LogRecord[]) {
  const delivered: WalkerOS.Event[] = [];
  const capture: Destination.Instance = {
    type: 'capture',
    config: {},
    push: (event) => {
      delivered.push(event);
    },
  };
  const flow = await startFlow({
    logger: {
      level: Level.WARN,
      handler: (level, message, context) => {
        records.push({ level, message, context });
      },
    },
    destinations: { capture: { code: capture } },
  });

  return { ...flow, delivered };
}

async function createTestCollector(
  records: LogRecord[],
): Promise<Collector.Instance> {
  return (await createTestFlow(records)).collector;
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

  it('logs one error per source and window, carrying only the reason', async () => {
    const collector = await createTestCollector(records);

    await collector.push({}, { id: 'web' });
    await collector.push({}, { id: 'web' });

    expect(records).toEqual([
      {
        level: Level.ERROR,
        message:
          'invalid event rejected (repeats within a minute are counted in status.sources.web.rejected)',
        context: {
          step: 'source.web',
          code: 'invalid',
          error: 'Event name is required',
        },
      },
    ]);
  });

  it('refuses an event that cannot be serialized', async () => {
    const { elb, delivered } = await createTestFlow(records);
    const data: WalkerOS.Properties = {};
    Reflect.set(data, 'self', data);

    const result = await elb('product view', data);

    expect(result).toEqual(
      expect.objectContaining({ ok: false, invalid: true }),
    );
    expect(result.error).toMatch(/^Event cannot be serialized: /);
    expect(delivered).toHaveLength(0);
    expect(records).toEqual([
      expect.objectContaining({
        level: Level.ERROR,
        context: expect.objectContaining({ code: 'invalid' }),
      }),
    ]);
  });

  // The refusal is for events JSON cannot carry at all. Values JSON drops or
  // converts on its own pass the collector unchanged.
  it('passes values JSON can carry', async () => {
    class P {
      x = 1;
    }
    const { elb, delivered } = await createTestFlow(records);
    const data: WalkerOS.Properties = { coupon: null };
    Reflect.set(data, 'date', new Date(0));
    Reflect.set(data, 'instance', new P());
    Reflect.set(data, 'callback', () => undefined);
    Reflect.set(data, 'missing', undefined);

    const result = await elb('product view', data);

    expect(result.ok).toBe(true);
    expect(delivered).toHaveLength(1);
    expect(delivered[0].data).toEqual(data);
    expect(records).toEqual([]);
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
