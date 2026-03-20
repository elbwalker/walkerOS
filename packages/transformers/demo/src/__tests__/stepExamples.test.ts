import type { WalkerOS, Transformer } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { transformerDemo } from '../index';
import type { Types } from '../types';
import { examples } from '../index';

describe('Step Examples', () => {
  const mockCollector = {} as any;

  const createInitContext = (
    config: Partial<Transformer.Config<Types>> = {},
    env: Partial<Transformer.Env<Types>> = {},
  ) =>
    ({
      collector: mockCollector,
      config,
      env,
      logger: createMockLogger(),
      id: 'test-transformer',
    }) as Transformer.Context<Types>;

  const createPushContext = () =>
    ({
      collector: mockCollector,
      config: {},
      env: {},
      logger: createMockLogger(),
      id: 'test-transformer',
    }) as any;

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.DeepPartialEvent;
    const mockLog = jest.fn();

    if (name === 'passthrough') {
      // Default config: logs and passes through (returns undefined)
      const instance = await transformerDemo(
        createInitContext({}, { log: mockLog }),
      );
      const result = await instance.push(event, createPushContext());

      expect(result).toBeUndefined();
      expect(mockLog).toHaveBeenCalledTimes(1);
    } else if (name === 'addProcessedFlag') {
      // With addProcessedFlag: modifies the event
      const instance = await transformerDemo(
        createInitContext(
          { settings: { addProcessedFlag: true } },
          { log: mockLog },
        ),
      );
      const result = await instance.push(event, createPushContext());

      expect(result).toBeDefined();
      const outEvent = (result as { event: WalkerOS.DeepPartialEvent }).event;
      const expectedOut = example.out as { event: WalkerOS.DeepPartialEvent };
      expect(outEvent.data).toMatchObject(expectedOut.event.data!);
      expect(outEvent.name).toBe(expectedOut.event.name);
    }
  });
});
