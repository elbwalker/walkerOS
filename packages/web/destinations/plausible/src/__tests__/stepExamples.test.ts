import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const mockPlausible = jest.fn();
    const env = clone(examples.env.push);
    env.window.plausible = mockPlausible;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb('walker destination', { ...dest, env }, { mapping: mappingConfig });
    await elb(event);

    expect(mockPlausible).toHaveBeenCalled();
    const outArgs = example.out as unknown[];
    const lastCall =
      mockPlausible.mock.calls[mockPlausible.mock.calls.length - 1];
    expect(lastCall[0]).toBe(outArgs[0]);
    if (outArgs[1]) {
      expect(lastCall[1]).toEqual(
        expect.objectContaining(outArgs[1] as object),
      );
    }
  });
});
