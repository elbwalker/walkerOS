import { enrichFlowConfigSchema } from '../monaco-schema-flow-config';

describe('enrichFlowConfigSchema', () => {
  // Use a simplified version of the actual schema structure (anyOf-based)
  const baseSchema = {
    anyOf: [
      {
        type: 'object',
        properties: {
          version: { type: 'number', const: 1, description: 'Version' },
          flows: {
            type: 'object',
            description: 'Flow configs',
            additionalProperties: {
              type: 'object',
              properties: {
                web: { type: 'object' },
                server: { type: 'object' },
                sources: {
                  type: 'object',
                  description: 'Source configurations',
                },
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
          },
          variables: { type: 'object', description: 'Variables' },
          definitions: { type: 'object', description: 'Definitions' },
          $schema: { type: 'string' },
          include: { type: 'array' },
        },
      },
    ],
  };

  it('adds markdownDescription to version', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const version = result.anyOf[0].properties.version;
    expect(version.markdownDescription).toContain('version');
  });

  it('adds defaultSnippets to flows', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const flows = result.anyOf[0].properties.flows;
    const snippets = flows.defaultSnippets;
    expect(snippets).toBeDefined();
    expect(snippets.length).toBeGreaterThanOrEqual(3);
  });

  it('includes web flow, server flow, and web+GA4 snippets', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const flows = result.anyOf[0].properties.flows;
    const labels = flows.defaultSnippets.map((s: { label: string }) =>
      s.label.toLowerCase(),
    );
    expect(labels.some((l: string) => l.includes('web'))).toBe(true);
    expect(labels.some((l: string) => l.includes('server'))).toBe(true);
    expect(
      labels.some((l: string) => l.includes('ga4') || l.includes('analytics')),
    ).toBe(true);
  });

  it('adds defaultSnippets to sources inside FlowSettings', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const sources =
      result.anyOf[0].properties.flows.additionalProperties.properties.sources;
    expect(sources?.defaultSnippets).toBeDefined();
  });

  it('adds defaultSnippets to destinations inside FlowSettings', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const dests =
      result.anyOf[0].properties.flows.additionalProperties.properties
        .destinations;
    expect(dests?.defaultSnippets).toBeDefined();
  });

  it('adds markdownDescription to variables with $var syntax example', () => {
    const result = enrichFlowConfigSchema(baseSchema);
    const variables = result.anyOf[0].properties.variables;
    expect(variables.markdownDescription).toContain('$var.');
  });

  it('does not mutate the base schema', () => {
    const clone = JSON.parse(JSON.stringify(baseSchema));
    enrichFlowConfigSchema(baseSchema);
    expect(baseSchema).toEqual(clone);
  });
});
