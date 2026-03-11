import type { Flow } from '../../types';

describe('Contract types', () => {
  it('should accept a valid named contract at Config level', () => {
    const setup: Flow.Config = {
      version: 3,
      contract: {
        default: {
          tagging: 1,
          description: 'Base contract',
          globals: {
            required: ['country'],
            properties: {
              country: { type: 'string' },
            },
          },
          events: {
            product: {
              '*': {
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
        },
        web: {
          extends: 'default',
          consent: {
            required: ['analytics'],
          },
        },
      },
      flows: {
        default: { web: {} },
      },
    };
    expect(setup.contract).toBeDefined();
  });

  it('should accept contract with extends chain', () => {
    const contract: Flow.Contract = {
      default: { tagging: 1 },
      web: { extends: 'default', events: { product: { view: {} } } },
      web_loggedin: {
        extends: 'web',
        user: { required: ['id'] },
      },
    };
    expect(Object.keys(contract)).toHaveLength(3);
  });
});
