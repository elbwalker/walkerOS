import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

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

    expect(mockSendWeb).toHaveBeenCalled();
    // The body (second arg) should match example.out
    const body = mockSendWeb.mock.calls[0][1];
    expect(body).toBe(example.out);
  });
});
