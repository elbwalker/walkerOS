import { mergeConfigSchema } from '../merge-config-schema';

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

    const merged = mergeConfigSchema('source', { settings: packageSettings });
    const props = merged.properties as Record<string, unknown>;

    // Base fields present
    expect(props.consent).toBeDefined();
    expect(props.require).toBeDefined();
    expect(props.logger).toBeDefined();
    expect(props.ingest).toBeDefined();
    expect(props.mapping).toBeDefined();
    expect(props.data).toBeDefined();

    // Package settings merged (without $schema)
    const settings = props.settings as Record<string, unknown>;
    expect(settings.type).toBe('object');
    expect((settings as any).$schema).toBeUndefined();
    expect((settings.properties as any).pageview).toBeDefined();

    // Runtime-only fields excluded
    expect(props.env).toBeUndefined();
    expect(props.onError).toBeUndefined();
    expect(props.primary).toBeUndefined();
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

    const merged = mergeConfigSchema('destination', {
      settings: packageSettings,
    });
    const props = merged.properties as Record<string, unknown>;

    // Destination-specific base fields
    expect(props.consent).toBeDefined();
    expect(props.require).toBeDefined();
    expect(props.queue).toBeDefined();
    expect(props.logger).toBeDefined();

    // Source-only fields absent
    expect(props.ingest).toBeUndefined();

    // Runtime-only excluded
    expect(props.env).toBeUndefined();
    expect(props.onError).toBeUndefined();
    expect(props.onLog).toBeUndefined();

    // Package settings merged
    const settings = props.settings as Record<string, unknown>;
    expect((settings as any).$schema).toBeUndefined();
    expect((settings.properties as any).url).toBeDefined();
  });

  it('should return base config with generic settings when no package settings provided', () => {
    const merged = mergeConfigSchema('source', {});
    const props = merged.properties as Record<string, unknown>;

    expect(props.consent).toBeDefined();
    expect(props.settings).toBeDefined();
  });

  it('should handle transformer type', () => {
    const merged = mergeConfigSchema('transformer', {});
    const props = merged.properties as Record<string, unknown>;

    expect(props.settings).toBeDefined();
    expect(props.ingest).toBeUndefined();
    expect(props.queue).toBeUndefined();
    expect(props.consent).toBeUndefined();
  });

  it('should handle store type', () => {
    const merged = mergeConfigSchema('store', {});
    const props = merged.properties as Record<string, unknown>;

    expect(props.settings).toBeDefined();
    expect(props.ingest).toBeUndefined();
    expect(props.queue).toBeUndefined();
    expect(props.consent).toBeUndefined();
  });
});
