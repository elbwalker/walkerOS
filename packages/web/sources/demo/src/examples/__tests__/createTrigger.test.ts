import type { Trigger, Collector, WalkerOS } from '@walkeros/core';
import { examples } from '../../dev';
import { sourceDemo } from '../../index';

describe('Demo createTrigger', () => {
  let instance: Trigger.Instance<WalkerOS.DeepPartialEvent, void>;

  beforeEach(() => {
    // The demo source uses `setTimeout` for its event-delay mechanism. Fake it
    // so pushed events resolve synchronously, but leave `setInterval` real —
    // startFlow's default cache store sweeps on `setInterval` and faking it
    // makes `runAllTimers()` loop forever (self-rescheduling sweep).
    jest.useFakeTimers({ doNotFake: ['setInterval'] });
  });

  afterEach(async () => {
    jest.useRealTimers();
    if (instance?.flow) {
      await instance.flow.collector.command('shutdown');
    }
  });

  // A flow with a demo source that declares NO `settings.events`, so the only
  // events that reach the capture destination are the ones the trigger pushes
  // (deterministic). A capture destination records every event it receives.
  const flowConfig = (captured: WalkerOS.Event[]): Collector.InitConfig => ({
    sources: {
      demo: {
        code: sourceDemo,
        config: { settings: { events: [] } },
      },
    },
    destinations: {
      capture: {
        code: {
          type: 'capture',
          config: {},
          push: (event: WalkerOS.Event) => {
            captured.push(event);
          },
        },
      },
    },
  });

  it('should be typed as Trigger.CreateFn', () => {
    const fn: Trigger.CreateFn<WalkerOS.DeepPartialEvent, void> =
      examples.createTrigger;
    expect(typeof fn).toBe('function');
  });

  it('should return trigger function and undefined flow before first call', async () => {
    instance = await examples.createTrigger(flowConfig([]));
    expect(instance.flow).toBeUndefined();
    expect(typeof instance.trigger).toBe('function');
  });

  it('should initialize flow on first trigger call', async () => {
    instance = await examples.createTrigger(flowConfig([]));

    expect(instance.flow).toBeUndefined();
    await instance.trigger()({ name: 'page view', data: { title: 'Home' } });
    expect(instance.flow).toBeDefined();
    expect(instance.flow!.collector).toBeDefined();
    expect(instance.flow!.elb).toBeDefined();
  });

  it('should reuse flow on subsequent trigger calls', async () => {
    instance = await examples.createTrigger(flowConfig([]));

    await instance.trigger()({ name: 'page view', data: { title: 'Home' } });
    const firstFlow = instance.flow;

    await instance.trigger()({ name: 'product view', data: { id: 'P1' } });
    expect(instance.flow).toBe(firstFlow);
  });

  it('should push supplied content through elb to the collector boundary', async () => {
    const captured: WalkerOS.Event[] = [];
    instance = await examples.createTrigger(flowConfig(captured));

    await instance.trigger()({
      name: 'product add',
      data: { id: 'abc', name: 'Test Product' },
    });
    jest.runAllTimers();
    await Promise.resolve();

    expect(captured).toContainEqual(
      expect.objectContaining({ name: 'product add' }),
    );
  });

  it('should only push the supplied content (no settings.events leakage)', async () => {
    const captured: WalkerOS.Event[] = [];
    instance = await examples.createTrigger(flowConfig(captured));

    await instance.trigger()({ name: 'order complete', data: { id: 'o1' } });
    jest.runAllTimers();
    await Promise.resolve();

    expect(captured.map((e) => e.name)).toEqual(['order complete']);
  });
});
