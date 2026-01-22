import type { Destination, On } from '@walkeros/core';
import { startFlow } from '..';

describe('on() event queuing', () => {
  it('queues on(consent) until init completes', async () => {
    const callOrder: string[] = [];

    const mockInit = jest.fn().mockImplementation(() => {
      callOrder.push('init');
      return { init: true };
    });

    const mockOn = jest.fn().mockImplementation((type: On.Types) => {
      callOrder.push(`on:${type}`);
    });

    const destination: Destination.Instance = {
      init: mockInit,
      push: jest.fn(),
      on: mockOn,
      config: {
        consent: { marketing: true },
      },
    };

    const { elb } = await startFlow({
      destinations: { test: { code: destination } },
    });

    // Grant marketing consent
    await elb('walker consent', { marketing: true });

    // init must come before any on events
    // on:run is queued during startFlow, on:consent is queued when consent granted
    expect(callOrder[0]).toBe('init');
    expect(callOrder).toContain('on:consent');
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalledWith('consent', expect.any(Object));
  });

  it('calls on() immediately for already-initialized destinations', async () => {
    const callOrder: string[] = [];

    const mockOn = jest.fn().mockImplementation((type: On.Types) => {
      callOrder.push(`on:${type}`);
    });

    const destination: Destination.Instance = {
      push: jest.fn(),
      on: mockOn,
      config: {
        init: true, // Already initialized
      },
    };

    const { elb } = await startFlow({
      destinations: { test: { code: destination } },
    });

    await elb('walker consent', { marketing: true });

    // For already-initialized destinations, on events are called immediately
    // on:run is called during startFlow, on:consent when consent granted
    expect(callOrder).toContain('on:run');
    expect(callOrder).toContain('on:consent');
    expect(mockOn).toHaveBeenCalledWith('consent', expect.any(Object));
  });

  it('queues multiple on events and replays in order', async () => {
    const callOrder: string[] = [];

    const mockInit = jest.fn().mockImplementation(() => {
      callOrder.push('init');
      return { init: true };
    });

    const mockOn = jest.fn().mockImplementation((type: On.Types) => {
      callOrder.push(`on:${type}`);
    });

    const destination: Destination.Instance = {
      init: mockInit,
      push: jest.fn(),
      on: mockOn,
      config: {
        consent: { marketing: true },
      },
    };

    const { elb, collector } = await startFlow({
      destinations: { test: { code: destination } },
      run: false, // Don't auto-run
    });

    // Manually trigger session event before consent
    collector.session = { isStart: true };

    // These should be queued since destination isn't initialized
    await elb('walker run');
    await elb('walker consent', { marketing: true });

    // After consent with matching requirement, init should be called
    // Then queued on events should replay
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(callOrder[0]).toBe('init');
    // Queued events come after init
    expect(callOrder.slice(1)).toContain('on:consent');
  });

  it('does not queue on events for destinations without on() handler', async () => {
    const mockInit = jest.fn().mockReturnValue({ init: true });
    const mockPush = jest.fn();

    const destination: Destination.Instance = {
      init: mockInit,
      push: mockPush,
      // No on() handler
      config: {
        consent: { marketing: true },
      },
    };

    const { elb } = await startFlow({
      destinations: { test: { code: destination } },
    });

    // Grant consent and push an event
    await elb('walker consent', { marketing: true });
    await elb('page view');

    // Init should be called when event is pushed, not when consent is granted
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('provides correct context to on() handler after queue flush', async () => {
    let receivedContext: Destination.Context | undefined;

    const mockOn = jest.fn().mockImplementation((_type, context) => {
      receivedContext = context;
    });

    const destination: Destination.Instance = {
      init: jest.fn().mockReturnValue({ init: true }),
      push: jest.fn(),
      on: mockOn,
      config: {
        consent: { marketing: true },
      },
    };

    const { elb } = await startFlow({
      destinations: { test: { code: destination } },
    });

    await elb('walker consent', { marketing: true });

    expect(receivedContext).toBeDefined();
    expect(receivedContext?.collector).toBeDefined();
    expect(receivedContext?.logger).toBeDefined();
    expect(receivedContext?.id).toBe('test');
    expect(receivedContext?.config.init).toBe(true);
    expect(receivedContext?.data).toEqual({ marketing: true });
  });
});
