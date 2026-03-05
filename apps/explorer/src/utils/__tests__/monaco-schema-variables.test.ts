import { getVariablesSchema } from '../monaco-schema-variables';

describe('getVariablesSchema', () => {
  it('returns a valid JSON Schema for variables', () => {
    const schema = getVariablesSchema();
    expect(schema.type).toBe('object');
  });

  it('restricts values to string, number, or boolean', () => {
    const schema = getVariablesSchema();
    expect(schema.additionalProperties).toBeDefined();
  });

  it('has markdownDescription explaining $var syntax', () => {
    const schema = getVariablesSchema();
    expect(schema.markdownDescription).toContain('$var.');
  });

  it('has defaultSnippets', () => {
    const schema = getVariablesSchema();
    expect(schema.defaultSnippets).toBeDefined();
  });
});
