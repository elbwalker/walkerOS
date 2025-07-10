import type { ServerCollector, DestinationServer, Elb } from '../types';
import type { WalkerOS } from '@walkerOS/core';
import { createEvent } from '@walkerOS/core';
import { createServerCollector } from '../';

describe('Server Collector', () => {
  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const mockDestination: DestinationServer.Destination = {
    config: {},
    push: mockDestinationPush,
    queue: [],
    dlq: [],
  };
  let mockEvent: WalkerOS.Event;
  let result: Elb.PushResult;

  function getCollector(custom?: Partial<ServerCollector.InitConfig>) {
    const config = custom || {
      destinations: { mock: mockDestination },
    };

    return createServerCollector(config);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockEvent = createEvent();
  });

  test('version equals package.json version', () => {
    const packageJsonVersion = jest.requireActual('../../package.json').version;

    const { collector } = getCollector({});
    expect(collector.version).toStrictEqual(packageJsonVersion);
  });

  test('create', () => {
    const { elb, collector } = getCollector();
    expect(elb).toBeDefined();
    expect(collector).toBeDefined();
    expect(elb).toBe(collector.push);
  });

  test('add destination', async () => {
    const { elb, collector } = getCollector({});
    expect(collector.destinations).toEqual({});
    elb('walker destination', mockDestination, { id: 'mock' });
    expect(collector.destinations).toEqual({
      mock: {
        config: { id: 'mock' },
        queue: [],
        dlq: [],
        push: mockDestinationPush,
      },
    });
  });

  test('push regular', async () => {
    const { elb } = getCollector();
    result = await elb(mockEvent);
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith(
      mockEvent,
      mockDestination.config,
      undefined,
      expect.anything(),
    );
    expect(result).toEqual({
      ok: true,
      event: mockEvent,
      successful: [{ id: 'mock', destination: mockDestination }],
      queued: [],
      failed: [],
    });
  });

  test('push event', async () => {
    const { elb } = getCollector({
      destinations: { mock: mockDestination },
      globalsStatic: { glow: 'balls' },
      user: { id: 'us3r1d' },
      consent: { test: true },
      tagging: 42,
    });
    const event = {
      event: 'e a',
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
        type: 'server',
        id: '',
        previous_id: '',
      },
    };

    await elb('e a');
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith(
      event,
      mockDestination.config,
      undefined,
      expect.anything(),
    );
  });

  test('push failure', async () => {
    const { elb } = getCollector();
    const elbWithZeroParams = elb as unknown as () => Promise<Elb.PushResult>;

    result = await elbWithZeroParams();
    expect(result.ok).toBeFalsy();

    result = await elb('foo');
    expect(result.ok).toBeFalsy();
  });

  test('globals', async () => {
    let { collector } = getCollector({});
    expect(collector).toHaveProperty('globals', {});
    expect(collector.config).toHaveProperty('globalsStatic', {});

    ({ collector } = getCollector({ globalsStatic: { foo: 'bar' } }));
    expect(collector).toHaveProperty('globals', { foo: 'bar' });
    expect(collector.config).toHaveProperty('globalsStatic', { foo: 'bar' });

    ({ collector } = getCollector({ globalsStatic: { foo: 'bar' } }));
    collector.globals.a = 1;
    await collector.push('walker globals', { b: 2 });
    let result = await collector.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', a: 1, b: 2 });

    await collector.push('walker run', { globals: { c: 3 } });
    result = await collector.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', c: 3 });
  });

  test('timing', async () => {
    const { elb } = getCollector();

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
    const { elb } = getCollector();

    mockEvent.source = { type: 'server', id: '1d', previous_id: 'pr3v10us' };
    result = await elb(mockEvent);

    expect(result.event).toHaveProperty('source', {
      type: 'server',
      id: '1d',
      previous_id: 'pr3v10us',
    });
  });

  test('version', async () => {
    const { elb } = getCollector();

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
