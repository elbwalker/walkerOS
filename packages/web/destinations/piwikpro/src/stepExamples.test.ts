import type { WalkerOS } from '@walkeros/core';
import type { DestinationPiwikPro } from '.';
import { startFlow } from '@walkeros/collector';
import { examples } from './dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const mockFn = jest.fn();
    const mockPaq: Array<unknown> = [];
    mockPaq.push = mockFn;

    const testEnv = {
      window: { _paq: mockPaq },
      document: {
        createElement: jest.fn(() => ({
          src: '',
          type: '',
          async: false,
          defer: false,
          setAttribute: jest.fn(),
          removeAttribute: jest.fn(),
        })),
        head: { appendChild: jest.fn() },
      },
    };

    const dest = jest.requireActual('.').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: {
          appId: 'XXX-XXX-XXX-XXX-XXX',
          url: 'https://test.piwik.pro/',
        },
        mapping: mappingConfig as DestinationPiwikPro.Rules,
      },
    );

    await elb(event);

    const outArrays = example.out as unknown[][];
    for (const expected of outArrays) {
      expect(mockFn).toHaveBeenCalledWith(expected);
    }
  });
});
