import { ConfigSchema, configJsonSchema } from '../store';

interface JsonNode {
  type?: unknown;
  description?: unknown;
  properties?: Record<string, unknown>;
  allOf?: Array<{ $ref?: string }>;
  $ref?: string;
  definitions?: Record<string, JsonNode>;
  $defs?: Record<string, JsonNode>;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === 'object' && value !== null;
}

/**
 * Unwrap a Zod 4 draft-7 root schema ({ allOf:[{$ref}], definitions }) down to
 * the node that actually carries `properties`.
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

describe('Store ConfigSchema', () => {
  it('parses { file: true }', () => {
    const parsed = ConfigSchema.parse({ file: true });
    expect(parsed.file).toBe(true);
  });

  it('leaves file undefined when absent', () => {
    const parsed = ConfigSchema.parse({});
    expect(parsed.file).toBeUndefined();
  });

  it('rejects a non-boolean file value', () => {
    expect(() => ConfigSchema.parse({ file: 'yes' })).toThrow();
  });

  it('renders file as a described boolean property in the JSON Schema', () => {
    const node = resolveConfigNode(configJsonSchema);
    const file = node.properties?.file;

    expect(isJsonNode(file)).toBe(true);
    if (!isJsonNode(file)) return;

    expect(file.type).toBe('boolean');
    expect(typeof file.description).toBe('string');
    expect(String(file.description ?? '').length).toBeGreaterThan(0);
  });
});
