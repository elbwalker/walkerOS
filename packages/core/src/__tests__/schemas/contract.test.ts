import { ConfigSchema, SettingsSchema } from '../../schemas/flow';

describe('Contract schema validation', () => {
  it('should accept a valid v2 setup with contract', () => {
    const result = ConfigSchema.safeParse({
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
                properties: { id: { type: 'string' } },
              },
            },
          },
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

  it('should accept a config with contract', () => {
    const result = SettingsSchema.safeParse({
      web: {},
      contract: {
        product: {
          add: {
            properties: {
              data: { type: 'object', required: ['quantity'] },
            },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-integer $tagging', () => {
    const result = ConfigSchema.safeParse({
      version: 2,
      contract: { $tagging: 'v1' },
      flows: { default: { web: {} } },
    });
    expect(result.success).toBe(false);
  });

  it('should accept v2 setup without contract', () => {
    const result = ConfigSchema.safeParse({
      version: 2,
      flows: { default: { web: {} } },
    });
    expect(result.success).toBe(true);
  });
});
