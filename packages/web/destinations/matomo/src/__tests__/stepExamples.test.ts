import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type PaqCall = unknown[];

describe('matomo web destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const event = example.in as WalkerOS.Event;

    // Create a recording _paq mock that accepts a single array argument per push.
    const calls: PaqCall[] = [];
    const mockPaq = [] as unknown as Array<unknown> & { push: jest.Mock };
    mockPaq.push = jest.fn((...args: unknown[]) => {
      calls.push(args[0] as PaqCall);
      return calls.length;
    });

    const env = clone(examples.env.push);
    env.window._paq = mockPaq;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { siteId: '1', url: 'https://analytics.example.com/' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const expected = example.out as PaqCall[];
    // Filter out init-phase calls; match only the last N calls against expected.
    const actual = calls.slice(-expected.length);
    expect(actual).toEqual(expected);
  });
});
