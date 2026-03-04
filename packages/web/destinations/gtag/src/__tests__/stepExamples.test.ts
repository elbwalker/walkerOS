import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const mockGtag = jest.fn();
    const env = clone(examples.env.push);
    env.window.gtag = mockGtag;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { ga4: { measurementId: 'G-XXXXXX-1' } },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    // gtag include settings add extra data_*/context_* fields beyond what
    // the mapping produces, so use objectContaining for the properties arg
    const outArgs = example.out as unknown[];
    const lastCall = mockGtag.mock.calls[mockGtag.mock.calls.length - 1];
    expect(lastCall[0]).toBe(outArgs[0]); // 'event'
    expect(lastCall[1]).toBe(outArgs[1]); // event name
    expect(lastCall[2]).toEqual(expect.objectContaining(outArgs[2] as object));
  });
});
