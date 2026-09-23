import type { Collector } from '@walkeros/core';
import type { CustomDimensions, Hit } from '../types';
import { getEvent } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { resolveDimensions } from '../dimensions';

describe('resolveDimensions', () => {
  let collector: Collector.Instance;
  const event = getEvent('product view');

  beforeAll(async () => {
    ({ collector } = await startFlow());
  });

  it('applies destination < rule < argument per key', async () => {
    expect(
      await resolveDimensions({
        destination: { '1': { value: 'a' }, '2': { value: 'x' } },
        rule: { '1': { value: 'b' } },
        argument: { dimension1: 'c' },
        event,
        collector,
      }),
    ).toEqual([
      ['dimension1', 'c'],
      ['dimension2', 'x'],
    ]);
  });

  it('orders by numeric id', async () => {
    expect(
      await resolveDimensions({
        destination: { '10': 'data.size', '2': 'data.color' },
        event,
        collector,
      }),
    ).toEqual([
      ['dimension2', 'black'],
      ['dimension10', 'l'],
    ]);
  });

  it.each<[string, CustomDimensions, CustomDimensions, Hit]>([
    [
      'a destination value',
      { '1': 'data.missing', '2': 'data.size' },
      {},
      [['dimension2', 'l']],
    ],
    [
      'a rule value, without falling back',
      { '1': { value: 'a' } },
      { '1': 'data.missing' },
      [],
    ],
  ])(
    'drops %s that resolves to undefined',
    async (_, destination, rule, expected) => {
      expect(
        await resolveDimensions({ destination, rule, event, collector }),
      ).toEqual(expected);
    },
  );

  it('ignores argument keys that are not dimensionN', async () => {
    expect(
      await resolveDimensions({
        argument: { dimension3: 'kept', currencyCode: 'EUR', dim4: 'x' },
        event,
        collector,
      }),
    ).toEqual([['dimension3', 'kept']]);
  });
});
