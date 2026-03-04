import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from './dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const mockFn = jest.fn();
    const env = clone(examples.env.push);
    env.sendWeb = mockFn;

    const dest = jest.requireActual('.').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { url: 'https://api.example.com/events' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockFn).toHaveBeenCalledTimes(1);
    const sentBody = mockFn.mock.calls[0][1];
    expect(sentBody).toEqual(example.out);
  });
});
