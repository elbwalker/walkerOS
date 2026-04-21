import type { WalkerOS, Transformer } from '@walkeros/core';
import { createMockContext } from '@walkeros/core';
import { transformerDemo } from '../index';
import type { Types } from '../types';
import { examples } from '../index';

describe('Step Examples', () => {
  const createInitContext = (
    config: Partial<Transformer.Config<Types>> = {},
    env: Partial<Transformer.Env<Types>> = {},
  ) =>
    createMockContext<Types>({
      config,
      env,
      id: 'test-transformer',
    });

  const createPushContext = () =>
    createMockContext<Types>({ id: 'test-transformer' });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.DeepPartialEvent;
    const mockLog = jest.fn();

    const settings =
      name === 'addProcessedFlag' ? { addProcessedFlag: true } : {};
    const instance = await transformerDemo(
      createInitContext({ settings }, { log: mockLog }),
    );
    const result = await instance.push(event, createPushContext());

    const actual =
      result === undefined
        ? []
        : [
            [
              'return',
              result === false
                ? false
                : (result as { event: WalkerOS.DeepPartialEvent }).event,
            ],
          ];

    expect(actual).toEqual(example.out);

    if (name === 'passthrough') {
      expect(mockLog).toHaveBeenCalledTimes(1);
    }
  });
});
