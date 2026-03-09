import type { Flow } from '../../types';

describe('Contract types', () => {
  it('should accept a valid contract at Setup level', () => {
    const setup: Flow.Config = {
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

  it('should accept contract at Settings level', () => {
    const config: Flow.Settings = {
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
