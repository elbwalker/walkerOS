import { SourceSchemas, DestinationSchemas } from './schemas';

type PackageType = 'source' | 'destination' | 'transformer' | 'store';

interface PackageSchemas {
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

// Fields to exclude from merged config (runtime-only, not flow.json-relevant)
const RUNTIME_ONLY_FIELDS = new Set(['env', 'onError', 'onLog', 'primary']);

// Base config schemas by type
const BASE_SCHEMAS: Partial<Record<PackageType, Record<string, unknown>>> = {
  source: SourceSchemas.configJsonSchema,
  destination: DestinationSchemas.configJsonSchema,
};

export function mergeConfigSchema(
  type: PackageType,
  packageSchemas: PackageSchemas,
): Record<string, unknown> {
  const rawBaseSchema = BASE_SCHEMAS[type];
  const baseSchema = resolveBaseSchema(rawBaseSchema);

  if (!baseSchema || !baseSchema.properties) {
    const result: Record<string, unknown> = {
      type: 'object',
      properties: {
        settings: packageSchemas.settings
          ? stripDollarSchema(packageSchemas.settings)
          : { description: 'Implementation-specific configuration' },
      },
    };
    return result;
  }

  const merged = JSON.parse(JSON.stringify(baseSchema)) as Record<
    string,
    unknown
  >;
  const props = merged.properties as Record<string, unknown>;

  for (const field of RUNTIME_ONLY_FIELDS) {
    delete props[field];
  }

  if (packageSchemas.settings) {
    props.settings = stripDollarSchema(packageSchemas.settings);
  }

  return merged;
}

/**
 * Resolve the effective base schema object. Zod 4 emits `.meta({id})`-decorated
 * root schemas as either:
 *   - Draft-7 form: `{ allOf: [{ $ref: '#/definitions/X' }], definitions: {...} }`
 *   - Draft-2020 form: `{ $ref: '#/$defs/X', $defs: {...} }`
 * Unwrap one level if needed so callers can mutate `properties` directly.
 */
function resolveBaseSchema(
  baseSchema: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!baseSchema) return baseSchema;
  if (baseSchema.properties) return baseSchema;

  const { ref, container, containerKey } = extractRef(baseSchema);
  if (!ref || !container) return baseSchema;

  const match = ref.match(/^#\/(\$defs|definitions)\/(.+)$/);
  if (!match) return baseSchema;

  const defKey = match[2];
  const resolved = container[defKey];
  if (!resolved || typeof resolved !== 'object') return baseSchema;

  // Merge the defs container back so nested refs still resolve
  return {
    ...(resolved as Record<string, unknown>),
    [containerKey]: container,
  };
}

function extractRef(schema: Record<string, unknown>): {
  ref: string | undefined;
  container: Record<string, unknown> | undefined;
  containerKey: string;
} {
  const defs = schema.$defs as Record<string, unknown> | undefined;
  const definitions = schema.definitions as Record<string, unknown> | undefined;
  const container = defs ?? definitions;
  const containerKey = defs ? '$defs' : 'definitions';

  let ref: string | undefined;
  if (typeof schema.$ref === 'string') {
    ref = schema.$ref;
  } else if (Array.isArray(schema.allOf)) {
    const first = schema.allOf[0] as Record<string, unknown> | undefined;
    if (first && typeof first.$ref === 'string') ref = first.$ref;
  }

  return { ref, container, containerKey };
}

function stripDollarSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const { $schema, ...rest } = schema;
  return rest;
}
