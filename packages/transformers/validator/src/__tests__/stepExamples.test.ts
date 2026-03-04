import type { Collector, Transformer, WalkerOS } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { transformerValidator } from '../transformer';
import type { ValidatorSettings } from '../types';
import { examples } from '../dev';

describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const config: Transformer.Config<Transformer.Types<ValidatorSettings>> = {
      settings: { format: true },
    };
    const context: Transformer.Context<Transformer.Types<ValidatorSettings>> = {
      collector: {} as Collector.Instance,
      config,
      env: {},
      logger: createMockLogger(),
      id: 'test-validator',
    };
    const transformer = await transformerValidator(context);
    const result = await transformer.push(
      example.in as WalkerOS.DeepPartialEvent,
      context,
    );

    if (example.out === false) {
      expect(result).toBe(false);
    } else {
      expect(result).toEqual(example.out);
    }
  });
});
