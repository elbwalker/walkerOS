import { mergeConfigSchema } from '../merge-config-schema';

/**
 * Structural shape of the merged JSON Schema returned by `mergeConfigSchema`.
 * Used purely for test-side narrowing — the function returns
 * `Record<string, unknown>` because JSON Schema is open-ended at runtime,
 * but tests only need to assert on a small set of well-known keys.
 */
interface MergedSchema {
  type?: unknown;
  properties?: {
    consent?: unknown;
    require?: unknown;
    queue?: unknown;
    logger?: unknown;
    ingest?: unknown;
    mapping?: unknown;
    data?: unknown;
    env?: unknown;
    onError?: unknown;
    onLog?: unknown;
    primary?: unknown;
    settings?: SettingsSchema;
  };
}

interface SettingsSchema {
  $schema?: unknown;
  type?: unknown;
  properties?: Record<string, unknown>;
  additionalProperties?: unknown;
  description?: unknown;
}

function asMergedSchema(value: Record<string, unknown>): MergedSchema {
  // mergeConfigSchema returns `Record<string, unknown>` but the runtime
  // shape conforms to MergedSchema. Re-typing through this guard avoids
  // per-call casts in every assertion below.
  return value;
}

describe('mergeConfigSchema', () => {
  it('should merge source base config with package settings schema', () => {
    const packageSettings = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        pageview: { type: 'boolean', default: true },
        prefix: { type: 'string', default: 'data-elb' },
      },
      additionalProperties: false,
    };

    const merged = asMergedSchema(
      mergeConfigSchema('source', { settings: packageSettings }),
    );
    const props = merged.properties;

    // Base fields present
    expect(props?.consent).toBeDefined();
    expect(props?.require).toBeDefined();
    expect(props?.logger).toBeDefined();
    expect(props?.ingest).toBeDefined();
    expect(props?.mapping).toBeDefined();
    expect(props?.data).toBeDefined();

    // Package settings merged (without $schema)
    const settings = props?.settings;
    expect(settings?.type).toBe('object');
    expect(settings?.$schema).toBeUndefined();
    expect(settings?.properties?.pageview).toBeDefined();

    // Runtime-only fields excluded
    expect(props?.env).toBeUndefined();
    expect(props?.onError).toBeUndefined();
    expect(props?.primary).toBeUndefined();
  });

  it('should merge destination base config with package settings schema', () => {
    const packageSettings = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        transport: { type: 'string', enum: ['fetch', 'beacon', 'xhr'] },
      },
    };

    const merged = asMergedSchema(
      mergeConfigSchema('destination', {
        settings: packageSettings,
      }),
    );
    const props = merged.properties;

    // Destination-specific base fields
    expect(props?.consent).toBeDefined();
    expect(props?.require).toBeDefined();
    expect(props?.queue).toBeDefined();
    expect(props?.logger).toBeDefined();

    // Source-only fields absent
    expect(props?.ingest).toBeUndefined();

    // Runtime-only excluded
    expect(props?.env).toBeUndefined();
    expect(props?.onError).toBeUndefined();
    expect(props?.onLog).toBeUndefined();

    // Package settings merged
    const settings = props?.settings;
    expect(settings?.$schema).toBeUndefined();
    expect(settings?.properties?.url).toBeDefined();
  });

  it('should return base config with generic settings when no package settings provided', () => {
    const merged = asMergedSchema(mergeConfigSchema('source', {}));
    const props = merged.properties;

    expect(props?.consent).toBeDefined();
    expect(props?.settings).toBeDefined();
  });

  it('should handle transformer type', () => {
    const merged = asMergedSchema(mergeConfigSchema('transformer', {}));
    const props = merged.properties;

    expect(props?.settings).toBeDefined();
    expect(props?.ingest).toBeUndefined();
    expect(props?.queue).toBeUndefined();
    expect(props?.consent).toBeUndefined();
  });

  it('should handle store type', () => {
    const merged = asMergedSchema(mergeConfigSchema('store', {}));
    const props = merged.properties;

    expect(props?.settings).toBeDefined();
    expect(props?.ingest).toBeUndefined();
    expect(props?.queue).toBeUndefined();
    expect(props?.consent).toBeUndefined();
  });
});
