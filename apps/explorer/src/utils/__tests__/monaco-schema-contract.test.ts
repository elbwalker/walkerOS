import { getEnrichedContractSchema } from '../monaco-schema-contract';

describe('getEnrichedContractSchema', () => {
  it('returns a valid JSON Schema', () => {
    const schema = getEnrichedContractSchema();
    expect(schema.type).toBe('object');
  });

  it('includes $tagging property', () => {
    const schema = getEnrichedContractSchema();
    expect(schema.properties.$tagging).toBeDefined();
  });

  it('has defaultSnippets at the root for common patterns', () => {
    const schema = getEnrichedContractSchema();
    expect(schema.defaultSnippets).toBeDefined();
    expect(schema.defaultSnippets.length).toBeGreaterThan(0);
  });

  it('includes a snippet for entity with action', () => {
    const schema = getEnrichedContractSchema();
    const snippet = schema.defaultSnippets.find((s: { label: string }) =>
      s.label.toLowerCase().includes('entity'),
    );
    expect(snippet).toBeDefined();
    expect(snippet.body).toBeDefined();
  });

  it('has markdownDescription explaining contract structure', () => {
    const schema = getEnrichedContractSchema();
    expect(schema.markdownDescription || schema.description).toBeDefined();
  });
});
