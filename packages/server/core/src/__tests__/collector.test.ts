import type { DestinationServer, Elb } from '../types';
import type { WalkerOS, Collector } from '@walkeros/core';
import { createEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

describe('Server Collector', () => {
  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const mockDestination: DestinationServer.Destination = {
    config: {},
    push: mockDestinationPush,
    queuePush: [],
    dlq: [],
  };
  let mockEvent: WalkerOS.Event;
  let result: Elb.PushResult;

  async function getCollector(config?: Partial<Collector.InitConfig>) {
    const finalConfig = config || {
      destinations: {
        mock: {
          code: mockDestination,
        },
      },
    };

    const { elb, collector } = await startFlow(finalConfig);
    return {
      elb,
      collector,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockEvent = createEvent();
  });

  test('version has correct format', async () => {
    const { collector: instance } = await getCollector({});
    expect(instance.version).toMatch(/^\d+\.\d+\./);
  });

  test('create', async () => {
    const { elb, collector: instance } = await getCollector();
    expect(elb).toBeDefined();
    expect(instance).toBeDefined();
    // ELB is now the ELB source's push function, not the collector's push
    expect(instance.sources.elb).toBeDefined();
    expect(instance.push).toBeDefined();
    expect(instance.command).toBeDefined();
  });

  test('add destination', async () => {
    const { elb, collector: instance } = await getCollector({});
    expect(instance.destinations).toEqual({});
    await elb('walker destination', mockDestination, { id: 'mock' });
    expect(instance.destinations).toEqual({
      mock: {
        config: { id: 'mock' },
        queuePush: [],
        dlq: [],
        push: mockDestinationPush,
        env: {},
      },
    });
  });

  test('push regular', async () => {
    const { elb } = await getCollector();
    result = await elb(mockEvent);
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith(
      mockEvent,
      expect.objectContaining({
        config: mockDestination.config,
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.event).toEqual(mockEvent);
    expect(result.done).toBeDefined();
    expect(result.done!['mock']).toBeDefined();
    expect(result.done!['mock'].type).toBe('unknown');
    expect(result.queued).toBeUndefined();
    expect(result.failed).toBeUndefined();
  });

  test('push event', async () => {
    const { elb } = await getCollector({
      destinations: { mock: { code: mockDestination } },
      globalsStatic: { glow: 'balls' },
      user: { id: 'us3r1d' },
      consent: { test: true },
      tagging: 42,
    });
    const event = {
      name: 'e a',
      data: {},
      context: {},
      custom: {},
      globals: { glow: 'balls' },
      user: { id: 'us3r1d' },
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'e',
      action: 'a',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
      version: {
        source: expect.any(String),
        tagging: 42,
      },
      source: {
        type: 'collector',
        id: '',
        previous_id: '',
      },
    };

    await elb('e a');
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        config: mockDestination.config,
      }),
    );
  });

  test('push failure', async () => {
    const { elb } = await getCollector();
    const elbWithZeroParams = elb as unknown as () => Promise<Elb.PushResult>;

    result = await elbWithZeroParams();
    expect(result.ok).toBeFalsy();

    result = await elb('foo');
    expect(result.ok).toBeFalsy();
  });

  test('globals', async () => {
    let { collector } = await getCollector({});
    expect(collector).toHaveProperty('globals', {});
    expect(collector.config).toHaveProperty('globalsStatic', {});

    ({ collector } = await getCollector({ globalsStatic: { foo: 'bar' } }));
    expect(collector).toHaveProperty('globals', { foo: 'bar' });
    expect(collector.config).toHaveProperty('globalsStatic', { foo: 'bar' });

    ({ collector } = await getCollector({ globalsStatic: { foo: 'bar' } }));
    collector.globals.a = 1;
    await collector.command('globals', { b: 2 });
    let result = await collector.push({ name: 'e a' });
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', a: 1, b: 2 });

    await collector.command('run', { globals: { c: 3 } });
    result = await collector.push({ name: 'e a' });
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', c: 3 });
  });

  test('timing', async () => {
    const { elb } = await getCollector();

    // Remove timing from event
    delete (mockEvent as unknown as WalkerOS.AnyObject).timing;

    jest.advanceTimersByTime(2500); // 2.5 sec load time
    let result = await elb(mockEvent);
    expect(result.event?.timing).toEqual(2.5);

    jest.advanceTimersByTime(1000); // 1 sec to new run
    await elb('walker run');
    result = await elb(mockEvent);
    expect(result.event?.timing).toEqual(0);

    jest.advanceTimersByTime(5000); // wait 5 sec
    result = await elb(mockEvent);
    expect(result.event?.timing).toEqual(5);
  });

  test('source', async () => {
    const { elb } = await getCollector();

    mockEvent.source = { type: 'server', id: '1d', previous_id: 'pr3v10us' };
    result = await elb(mockEvent);

    expect(result.event).toHaveProperty('source', {
      type: 'server',
      id: '1d',
      previous_id: 'pr3v10us',
    });
  });

  test('version', async () => {
    const { elb } = await getCollector();

    mockEvent.version = { source: 'cl13nt', tagging: 42 };
    result = await elb(mockEvent);

    expect(result.event).toEqual(
      expect.objectContaining({
        version: {
          source: 'cl13nt',
          tagging: 42,
        },
      }),
    );
  });
});
