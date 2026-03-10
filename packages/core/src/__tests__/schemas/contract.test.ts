import { ConfigSchema } from '../../schemas/flow';

describe('Contract schema validation', () => {
  it('should accept a valid v2 setup with contract', () => {
    const result = ConfigSchema.safeParse({
      version: 2,
      contract: {
        default: {
          tagging: 1,
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
        default: { web: {} },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept a v1 setup without contract', () => {
    const result = ConfigSchema.safeParse({
      version: 1,
      flows: {
        default: { web: {} },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept contract with only sections, no events', () => {
    const result = ConfigSchema.safeParse({
      version: 2,
      contract: {
        consent_only: {
          consent: { required: ['analytics'] },
        },
      },
      flows: { default: { web: {} } },
    });
    expect(result.success).toBe(true);
  });

  it('should accept v2 setup without contract', () => {
    const result = ConfigSchema.safeParse({
      version: 2,
      flows: { default: { web: {} } },
    });
    expect(result.success).toBe(true);
  });

  it('should reject contract entry with invalid tagging', () => {
    const result = ConfigSchema.safeParse({
      version: 2,
      contract: {
        web: { tagging: -1 },
      },
      flows: { default: { web: {} } },
    });
    expect(result.success).toBe(false);
  });
});
