import { enrichFlowConfigSchema } from '../monaco-schema-flow-config';

describe('enrichFlowConfigSchema', () => {
  // Simplified Flow.Json (v4) schema shape:
  // root: { allOf: [{ $ref: '#/definitions/FlowJson' }], definitions: {...} }
  const baseSchema = {
    allOf: [{ $ref: '#/definitions/FlowJson' }],
    definitions: {
      FlowJson: {
        type: 'object',
        properties: {
          version: { type: 'number', const: 4, description: 'Version' },
          flows: {
            type: 'object',
            description: 'Flow configs',
            additionalProperties: {
              $ref: '#/definitions/Flow',
            },
          },
          variables: { type: 'object', description: 'Variables' },
          definitions: { type: 'object', description: 'Definitions' },
          $schema: { type: 'string' },
          include: { type: 'array' },
        },
      },
      Flow: {
        type: 'object',
        properties: {
          config: { $ref: '#/definitions/FlowConfig' },
          sources: { type: 'object', description: 'Source configurations' },
          destinations: {
            type: 'object',
            description: 'Destination configurations',
          },
          transformers: {
            type: 'object',
            description: 'Transformer configurations',
          },
          collector: {},
        },
      },
      FlowConfig: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['web', 'server'] },
          url: { type: 'string' },
          settings: { type: 'object' },
          bundle: { type: 'object' },
        },
      },
    },
  };

  it('adds markdownDescription to version', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const version = result.definitions.FlowJson.properties.version;
    expect(version.markdownDescription).toContain('version');
  });

  it('adds defaultSnippets to flows', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const flows = result.definitions.FlowJson.properties.flows;
    const snippets = flows.defaultSnippets;
    expect(snippets).toBeDefined();
    expect(snippets.length).toBeGreaterThanOrEqual(3);
  });

  it('includes web flow, server flow, and web+GA4 snippets', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const flows = result.definitions.FlowJson.properties.flows;
    const labels = flows.defaultSnippets.map((s: { label: string }) =>
      s.label.toLowerCase(),
    );
    expect(labels.some((l: string) => l.includes('web'))).toBe(true);
    expect(labels.some((l: string) => l.includes('server'))).toBe(true);
    expect(
      labels.some((l: string) => l.includes('ga4') || l.includes('analytics')),
    ).toBe(true);
  });

  it('adds defaultSnippets to sources inside Flow', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const sources = result.definitions.Flow.properties.sources;
    expect(sources?.defaultSnippets).toBeDefined();
  });

  it('adds defaultSnippets to destinations inside Flow', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const dests = result.definitions.Flow.properties.destinations;
    expect(dests?.defaultSnippets).toBeDefined();
  });

  it('adds markdownDescription to config inside Flow', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const config = result.definitions.Flow.properties.config;
    expect(config.markdownDescription).toBeDefined();
    expect(config.markdownDescription).toContain('platform');
  });

  it('adds markdownDescription to platform inside FlowConfig', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const platform = result.definitions.FlowConfig.properties.platform;
    expect(platform.markdownDescription).toBeDefined();
    expect(platform.markdownDescription).toContain('web');
    expect(platform.markdownDescription).toContain('server');
  });

  it('adds markdownDescription to variables with $var syntax example', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const variables = result.definitions.FlowJson.properties.variables;
    expect(variables.markdownDescription).toContain('$var.');
  });

  it('does not mutate the base schema', () => {
    const clone = JSON.parse(JSON.stringify(baseSchema));
    enrichFlowConfigSchema(baseSchema);
    expect(baseSchema).toEqual(clone);
  });
});
