import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * API web destination invokes `env.sendWeb(url, body, options)` exactly once
 * per push. Captures calls and asserts the `['sendWeb', ...args]` tuple list
 * equals the example's `out`.
 */
describe('Step Examples', () => {
  const mockSendWeb = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const env = clone(examples.env.push);
    env.sendWeb = mockSendWeb;

    const dest = jest.requireActual('../').default;
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

    const captured: Captured[] = mockSendWeb.mock.calls.map(
      (args) => ['sendWeb', ...args] as Captured,
    );

    expect(captured).toEqual(example.out);
  });
});
