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
  const baseSchema = BASE_SCHEMAS[type];

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

function stripDollarSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const { $schema, ...rest } = schema;
  return rest;
}
