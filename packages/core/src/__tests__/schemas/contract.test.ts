import { JsonSchema } from '../../schemas/flow';

describe('Contract schema validation', () => {
  it('should accept a valid v4 setup with contract', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      contract: {
        default: {
          globals: { required: ['country'] },
          events: {
            product: {
              '*': {
                properties: {
                  data: {
                    type: 'object',
                    required: ['id'],
                    properties: { id: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
        web: {
          extends: 'default',
          consent: { required: ['analytics'] },
        },
      },
      flows: {
        default: { config: { platform: 'web' } },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject v3 configs', () => {
    const result = JsonSchema.safeParse({
      version: 3,
      flows: {
        default: { config: { platform: 'web' } },
      },
    });
    expect(result.success).toBe(false);
  });

  it('should accept contract with only sections, no events', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      contract: {
        consent_only: {
          consent: { required: ['analytics'] },
        },
      },
      flows: { default: { config: { platform: 'web' } } },
    });
    expect(result.success).toBe(true);
  });

  it('should accept v4 setup without contract', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      flows: { default: { config: { platform: 'web' } } },
    });
    expect(result.success).toBe(true);
  });
});
