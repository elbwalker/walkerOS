import type { Flow, WalkerOS } from '@walkeros/core';
import { resolveContracts } from '@walkeros/core';
import { validateEventAgainstContract } from '../validate';

/**
 * Contract resolution feeds the runtime validator: whatever
 * {@link resolveContracts} produces must still compile and assert through the
 * pinned @cfworker/json-schema. Definitions named like annotation keywords are
 * the sharp edge: losing `$defs.title` would leave a dangling `$ref` that
 * makes the validator throw instead of returning a verdict.
 */
describe('resolved contracts against the pinned validator', () => {
  const contract: Flow.Contract = {
    web: {
      events: {
        product: {
          view: {
            $defs: {
              title: {
                type: 'string',
                minLength: 2,
                description: 'Product display name',
              },
            },
            type: 'object',
            properties: {
              data: {
                type: 'object',
                required: ['title'],
                properties: {
                  // Two ref sites: one under a data key named like an
                  // annotation, one under a neutral name. Both must keep
                  // resolving against the surviving `$defs.title`.
                  title: { $ref: '#/$defs/title' },
                  name: { $ref: '#/$defs/title' },
                },
              },
            },
          },
        },
      },
    },
  };

  it('a $ref into a definition named like an annotation still resolves', () => {
    const rules = Object.values(resolveContracts(contract));
    const event: WalkerOS.DeepPartialEvent = {
      entity: 'product',
      action: 'view',
      data: { title: 'Tee', name: 'Tee' },
    };
    const result = validateEventAgainstContract(event, undefined, {
      contracts: rules,
    });
    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('stripped schemas still assert their constraints', () => {
    const rules = Object.values(resolveContracts(contract));

    const tooShort: WalkerOS.DeepPartialEvent = {
      entity: 'product',
      action: 'view',
      data: { title: 'T' },
    };
    expect(
      validateEventAgainstContract(tooShort, undefined, { contracts: rules })
        .isValid,
    ).toBe(false);

    const missingTitle: WalkerOS.DeepPartialEvent = {
      entity: 'product',
      action: 'view',
      data: { name: 'Tee' },
    };
    expect(
      validateEventAgainstContract(missingTitle, undefined, {
        contracts: rules,
      }).isValid,
    ).toBe(false);
  });
});
