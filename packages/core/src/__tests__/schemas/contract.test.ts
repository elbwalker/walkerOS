import { JsonSchema } from '../../schemas/flow';

describe('Contract schema validation', () => {
  it('should accept a valid v4 setup with contract', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      contract: {
        default: {
          schema: { properties: { globals: { required: ['country'] } } },
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
          extend: 'default',
          schema: { properties: { consent: { required: ['analytics'] } } },
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

  it.each(['globals', 'context', 'custom', 'user', 'consent'])(
    'rejects the %s section: nothing enforces it (E9)',
    (section) => {
      const result = JsonSchema.safeParse({
        version: 4,
        contract: {
          web: { [section]: { required: ['analytics'] } },
        },
        flows: { default: { config: { platform: 'web' } } },
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        code: 'unrecognized_keys',
        keys: [section],
        path: ['contract', 'web'],
      });
    },
  );

  it('should accept v4 setup without contract', () => {
    const result = JsonSchema.safeParse({
      version: 4,
      flows: { default: { config: { platform: 'web' } } },
    });
    expect(result.success).toBe(true);
  });
});
