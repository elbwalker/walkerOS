import { DestinationSchemas, StoreSchemas, SourceSchemas } from '../index';

interface JsonNode {
  type?: unknown;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: unknown;
  allOf?: Array<{ $ref?: string }>;
  $ref?: string;
  definitions?: Record<string, JsonNode>;
  $defs?: Record<string, JsonNode>;
}

/**
 * Unwrap a Zod 4 draft-7 root schema ({ allOf:[{$ref}], definitions }) down to
 * the node that actually carries `properties`/`additionalProperties`.
 */
function resolveConfigNode(schema: JsonNode): JsonNode {
  if (schema.properties) return schema;
  const container = schema.$defs ?? schema.definitions;
  let ref: string | undefined = schema.$ref;
  if (!ref && schema.allOf && schema.allOf[0]) ref = schema.allOf[0].$ref;
  if (!ref || !container) return schema;
  const key = ref.split('/').pop();
  if (!key) return schema;
  return container[key] ?? schema;
}

describe('config.credentials field on core Config schemas', () => {
  const cases: Array<{ name: string; schema: JsonNode }> = [
    { name: 'destination', schema: DestinationSchemas.configJsonSchema },
    { name: 'store', schema: StoreSchemas.configJsonSchema },
    { name: 'source', schema: SourceSchemas.configJsonSchema },
  ];

  for (const { name, schema } of cases) {
    describe(`${name} config schema`, () => {
      const node = resolveConfigNode(schema);

      it('exposes an optional credentials property', () => {
        expect(node.properties?.credentials).toBeDefined();
        // optional → not in `required`
        expect(node.required ?? []).not.toContain('credentials');
      });

      it('remains additionalProperties:false', () => {
        expect(node.additionalProperties).toBe(false);
      });
    });
  }

  it('destination config parses with and without credentials', () => {
    const without = DestinationSchemas.ConfigSchema.safeParse({});
    expect(without.success).toBe(true);

    const withString = DestinationSchemas.ConfigSchema.safeParse({
      credentials: '$env.SA',
    });
    expect(withString.success).toBe(true);

    const withObject = DestinationSchemas.ConfigSchema.safeParse({
      credentials: { client_email: 'a@b.com', private_key: 'pk' },
    });
    expect(withObject.success).toBe(true);
  });

  it('store config parses with and without credentials', () => {
    expect(StoreSchemas.ConfigSchema.safeParse({}).success).toBe(true);
    expect(
      StoreSchemas.ConfigSchema.safeParse({ credentials: '$env.SA' }).success,
    ).toBe(true);
  });

  it('source config parses with and without credentials', () => {
    expect(SourceSchemas.ConfigSchema.safeParse({}).success).toBe(true);
    expect(
      SourceSchemas.ConfigSchema.safeParse({ credentials: '$env.SA' }).success,
    ).toBe(true);
  });
});
