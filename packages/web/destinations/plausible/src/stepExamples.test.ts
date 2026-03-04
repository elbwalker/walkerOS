import type { WalkerOS } from '@walkeros/core';
import type { DestinationPlausible } from '.';
import { startFlow } from '@walkeros/collector';
import { mockEnv } from '@walkeros/core';
import { examples } from './dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const calls: Array<{ path: string[]; args: unknown[] }> = [];
    const testEnv = mockEnv(examples.env.push, (path, args) => {
      calls.push({ path, args });
    });

    const dest = jest.requireActual('.').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env: testEnv as DestinationPlausible.Env },
      { mapping: mappingConfig as DestinationPlausible.Rules },
    );

    await elb(event);

    expect(calls).toContainEqual({
      path: ['window', 'plausible'],
      args: example.out,
    });
  });
});
