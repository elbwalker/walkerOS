import type { RJSFSchema } from '@rjsf/utils';

/**
 * Returns a shallow clone of the JSON Schema with the listed property keys
 * removed from both `properties` and `required`. Used by group-index pages to
 * hide dev-only or package-specific fields from user-facing documentation
 * without modifying the source-of-truth schemas in @walkeros/core.
 */
export function omitSchemaProperties(
  schema: RJSFSchema,
  keys: readonly string[],
): RJSFSchema {
  if (!schema.properties) return schema;
  const keySet = new Set(keys);
  const properties = Object.fromEntries(
    Object.entries(schema.properties).filter(([k]) => !keySet.has(k)),
  );
  const required = Array.isArray(schema.required)
    ? schema.required.filter((k) => !keySet.has(k))
    : schema.required;
  return { ...schema, properties, required };
}
