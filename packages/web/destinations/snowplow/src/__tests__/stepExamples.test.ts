import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const mockSnowplow = jest.fn();
    const env = clone(examples.env.push);
    env.window.snowplow = mockSnowplow;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: {
          collectorUrl: 'https://collector.example.com',
          pageViewEvent: 'page view',
        },
        mapping: mappingConfig,
      },
    );
    await elb(event);

    expect(mockSnowplow).toHaveBeenCalled();
    const outArgs = example.out as unknown[];
    // Find the matching call (skip init calls like newTracker)
    const pushCalls = mockSnowplow.mock.calls.filter(
      (call: unknown[]) => call[0] === outArgs[0],
    );
    expect(pushCalls.length).toBeGreaterThan(0);
    const lastCall = pushCalls[pushCalls.length - 1];
    outArgs.forEach((arg, i) => {
      if (typeof arg === 'object' && arg !== null) {
        expect(lastCall[i]).toEqual(expect.objectContaining(arg as object));
      } else {
        expect(lastCall[i]).toBe(arg);
      }
    });
  });
});
