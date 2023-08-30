import type { NodeClient, NodeDestination } from '../types';
import type { Elbwalker } from '@elbwalker/types';
import { createNodeClient } from '../';

describe('Client', () => {
  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const version = { client: expect.any(String), tagging: expect.any(Number) };
  const mockEvent: Elbwalker.Event = {
    event: 'entity action',
    data: expect.any(Object),
    context: {},
    custom: {},
    globals: {},
    user: {},
    nested: [],
    consent: {},
    id: expect.any(String),
    trigger: '',
    entity: 'entity',
    action: 'action',
    timestamp: expect.any(Number),
    timing: expect.any(Number),
    group: expect.any(String),
    count: expect.any(Number),
    version,
    source: {
      type: 'node',
      id: '@TODO',
      previous_id: '@TODO',
    },
  };
  const mockDestination: NodeDestination.Function = {
    config: {},
    push: mockDestinationPush,
  };

  function getClient(custom?: Partial<NodeClient.Config>) {
    const config = custom || {
      destinations: { mock: mockDestination },
    };

    return createNodeClient(config);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('create', () => {
    const { elb, instance } = getClient();
    expect(elb).toBeDefined();
    expect(instance).toBeDefined();
    expect(elb).toBe(instance.push);
  });

  test('add destination', async () => {
    const { instance } = getClient({});
    expect(instance.config.destinations).toEqual({});
    instance.addDestination('mock', mockDestination);
    expect(instance.config.destinations).toEqual({ mock: mockDestination });
  });

  test('push regular', async () => {
    const { elb } = getClient();
    const result = await elb(mockEvent);
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith([
      { event: mockEvent, config: mockDestination.config },
    ]);
    expect(result).toEqual({
      event: mockEvent,
      status: { ok: true },
      successful: [{ id: 'mock', destination: mockDestination }],
      failed: [],
    });
  });

  test('push event', async () => {
    const { elb } = getClient({
      destinations: { mock: mockDestination },
      globals: { glow: 'balls' },
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
        client: expect.any(String),
        tagging: 42,
      },
      source: {
        type: 'node',
        id: '@TODO',
        previous_id: '@TODO',
      },
    };

    await elb('e a');
    expect(mockDestinationPush).toHaveBeenCalledTimes(1);
    expect(mockDestinationPush).toHaveBeenCalledWith([
      {
        event,
        config: mockDestination.config,
      },
    ]);
  });

  test('push failure', async () => {
    const { elb } = getClient();
    let result = await (elb as Function)();

    expect(result.status).toHaveProperty('ok', false);
    expect(result.status).toHaveProperty('error', expect.any(Error));
    expect(result.status.error).toHaveProperty(
      'message',
      'Event name is required',
    );

    result = await elb('foo');
    expect(result.status).toHaveProperty('ok', false);
    expect(result.status).toHaveProperty('error', expect.any(Error));
    expect(result.status.error).toHaveProperty(
      'message',
      'Event name is invalid',
    );
  });

  test('globals', async () => {
    let { instance } = getClient({});
    expect(instance.config).toHaveProperty('globals', {});
    expect(instance.config).toHaveProperty('globalsStatic', {});

    ({ instance } = getClient({ globals: { foo: 'bar' } }));
    expect(instance.config).toHaveProperty('globals', { foo: 'bar' });
    expect(instance.config).toHaveProperty('globalsStatic', { foo: 'bar' });

    ({ instance } = getClient({ globals: { foo: 'bar' } }));
    instance.config.globals.a = 1;
    await instance.push('walker config', { globals: { b: 2 } });
    let result = await instance.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', a: 1, b: 2 });

    await instance.push('walker run', { c: 3 });
    result = await instance.push('e a');
    expect(result.event).toHaveProperty('count', 1);
    expect(result.event).toHaveProperty('globals', { foo: 'bar', c: 3 });
  });

  test('timing', async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const { elb } = getClient();

    jest.advanceTimersByTime(2500); // 2.5 sec load time

    let result = await elb(mockEvent);
    expect(result.event?.timing).toEqual(2.5);

    jest.advanceTimersByTime(1000); // 1 sec to new run
    result = await elb('foo bar');
    expect(result.event!.timing).toEqual(3.5);

    // @TODO test timing reset after walker run command
  });
});
