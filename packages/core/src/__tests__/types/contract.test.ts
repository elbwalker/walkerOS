import type { Flow } from '../../types';

describe('Contract types', () => {
  it('should accept a valid contract at Setup level', () => {
    const setup: Flow.Setup = {
      version: 2,
      contract: {
        $tagging: 1,
        product: {
          '*': {
            description: 'A product',
            properties: {
              data: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string', description: 'Product SKU' },
                },
              },
            },
          },
        },
      },
      flows: {
        default: { web: {} },
      },
    };
    expect(setup.contract).toBeDefined();
  });

  it('should accept contract at Config level', () => {
    const config: Flow.Config = {
      web: {},
      contract: {
        product: {
          add: {
            properties: {
              data: {
                type: 'object',
                required: ['quantity'],
                properties: {
                  quantity: { type: 'integer', minimum: 1 },
                },
              },
            },
          },
        },
      },
    };
    expect(config.contract).toBeDefined();
  });
});
