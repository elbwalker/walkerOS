import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const mockFbq = jest.fn();
    const env = clone(examples.env.push);
    env.window.fbq = mockFbq;
    env.window._fbq = mockFbq;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { pixelId: '1234567890' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const outArgs = example.out as unknown[];
    const lastCall = mockFbq.mock.calls[mockFbq.mock.calls.length - 1];
    expect(lastCall[0]).toBe(outArgs[0]); // 'track' or 'trackCustom'
    expect(lastCall[1]).toBe(outArgs[1]); // event name
    expect(lastCall[2]).toEqual(expect.objectContaining(outArgs[2] as object));
    expect(lastCall[3]).toEqual(outArgs[3]); // { eventID: ... }
  });
});
