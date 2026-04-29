export interface MonacoSchemaExtension {
  defaultSnippets?: Array<{
    label: string;
    description?: string;
    markdownDescription?: string;
    body?: unknown;
    bodyText?: string;
  }>;
  markdownDescription?: string;
  enumDescriptions?: string[];
  markdownEnumDescriptions?: string[];
  deprecationMessage?: string;
  errorMessage?: string;
  patternErrorMessage?: string;
  doNotSuggest?: boolean;
  suggestSortText?: string;
}

type EnrichmentMap = Record<string, MonacoSchemaExtension>;

/**
 * Deep-merges Monaco-specific JSON Schema extensions into a base schema.
 * Keys in the enrichment map are dot-paths (e.g., 'properties.sources').
 * Empty string '' targets the root. Does not mutate the original.
 */
export function enrichSchema<T extends Record<string, unknown>>(
  baseSchema: T,
  enrichments: EnrichmentMap,
): T {
  const schema: T = JSON.parse(JSON.stringify(baseSchema));

  for (const [path, extensions] of Object.entries(enrichments)) {
    const target = path === '' ? schema : getNestedObject(schema, path);
    if (target && typeof target === 'object') {
      Object.assign(target, extensions);
    }
  }

  return schema;
}

function getNestedObject(
  obj: Record<string, unknown>,
  path: string,
): Record<string, unknown> | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (
      current &&
      typeof current === 'object' &&
      key in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current as Record<string, unknown> | undefined;
}
