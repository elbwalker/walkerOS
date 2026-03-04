import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '.';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;
    const expectedOut = example.out as {
      url: string;
      body: string;
      headers?: Record<string, string>;
    };

    const mockFn = jest.fn();
    const env = clone(examples.env.standard);
    env.sendServer = mockFn;

    const dest = jest.requireActual('.').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: {
          url: expectedOut.url,
          headers: expectedOut.headers,
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(mockFn).toHaveBeenCalledTimes(1);
    const [calledUrl, calledBody] = mockFn.mock.calls[0];
    expect(calledUrl).toBe(expectedOut.url);
    expect(calledBody).toEqual(expectedOut.body);
  });
});
