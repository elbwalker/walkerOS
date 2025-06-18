import type { SourceNode, DestinationNode, Elb } from '../types';
import type { WalkerOS } from '@walkerOS/types';
import { createEvent } from '@walkerOS/utils';
import { createSourceNode } from '../';

describe('Source Node', () => {
  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const mockDestination: DestinationNode.Destination = {
    config: {},
    push: mockDestinationPush,
  };
  let mockEvent: WalkerOS.Event;
  let result: Elb.PushResult;

  function getSource(custom?: Partial<SourceNode.InitConfig>) {
    const config = custom || {
      destinations: { mock: mockDestination },
    };

    return createSourceNode(config);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    mockEvent = createEvent();
  });

  test('version equals package.json version', () => {
    const packageJsonVersion = jest.requireActual('../../package.json').version;

    const { instance } = getSource({});
    expect(instance.version).toStrictEqual(packageJsonVersion);
  });

  test('create', () => {
    const { elb, instance } = getSource();
    expect(elb).toBeDefined();
    expect(instance).toBeDefined();
    expect(elb).toBe(instance.push);
  });

  test('add destination', async () => {
    const { elb, instance } = getSource({});
    expect(instance.destinations).toEqual({});
    elb('walker destination', mockDestination, { id: 'mock' });
    expect(instance.destinations).toEqual({
      mock: {
        config: { id: 'mock' },
        queue: [],
        push: mockDestinationPush,
      },
    });
  });

  test('push regular', async () => {
    const { elb } = getSource();
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
    const { elb } = getSource({
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
        type: 'node',
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
    const { elb } = getSource();
    const elbWithZeroParams = elb as unknown as () => Promise<Elb.PushResult>;

    result = await elbWithZeroParams();
    expect(result.ok).toBeFalsy();

    result = await elb('foo');
    expect(result.ok).toBeFalsy();
  });

  test('globals', async () => {
    let { instance } = getSource({});
    expect(instance).toHaveProperty('globals', {});
    expect(instance.config).toHaveProperty('globalsStatic', {});

    ({ instance } = getSource({ globalsStatic: { foo: 'bar' } }));
    expect(instance).toHaveProperty('globals', { foo: 'bar' });
    expect(instance.config).toHaveProperty('globalsStatic', { foo: 'bar' });

    ({ instance } = getSource({ globalsStatic: { foo: 'bar' } }));
    instance.globals.a = 1;
    await instance.push('walker globals', { b: 2 });
    let result = await instance.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', a: 1, b: 2 });

    await instance.push('walker run', { globals: { c: 3 } });
    result = await instance.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', c: 3 });
  });

  test('timing', async () => {
    const { elb } = getSource();

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
    const { elb } = getSource();

    mockEvent.source = { type: 'node', id: '1d', previous_id: 'pr3v10us' };
    result = await elb(mockEvent);

    expect(result.event).toHaveProperty('source', {
      type: 'node',
      id: '1d',
      previous_id: 'pr3v10us',
    });
  });

  test('version', async () => {
    const { elb } = getSource();

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
