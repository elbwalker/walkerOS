import type { Transformer, WalkerOS } from '@walkeros/core';
import { createMockContext } from '@walkeros/core';
import { transformerValidator } from '../transformer';
import type { ValidatorSettings } from '../types';
import { examples } from '../dev';

describe('Step Examples', () => {
  // Per-example settings overrides for examples needing contract validation
  const settingsOverrides: Record<string, ValidatorSettings> = {
    contractValidationPass: {
      format: true,
      events: {
        order: {
          complete: {
            properties: {
              data: {
                type: 'object',
                required: ['id', 'total', 'currency'],
              },
            },
          },
        },
      },
    },
  };

  const defaultSettings: ValidatorSettings = { format: true };

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const settings = settingsOverrides[name] || defaultSettings;
    const config: Transformer.Config<Transformer.Types<ValidatorSettings>> = {
      settings,
    };
    const context = createMockContext<Transformer.Types<ValidatorSettings>>({
      config,
      id: 'test-validator',
    });
    const transformer = await transformerValidator(context);
    const result = await transformer.push(
      example.in as WalkerOS.DeepPartialEvent,
      context,
    );

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
  });
});
