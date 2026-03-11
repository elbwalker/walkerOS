import { enrichSchema } from '../monaco-schema-enrichment';

describe('enrichSchema', () => {
  it('adds defaultSnippets to a property', () => {
    const base = {
      type: 'object',
      properties: { name: { type: 'string', description: 'A name' } },
    };
    const result = enrichSchema(base, {
      'properties.name': {
        defaultSnippets: [{ label: 'example', body: 'hello' }],
      },
    });
    expect(result.properties.name.defaultSnippets).toEqual([
      { label: 'example', body: 'hello' },
    ]);
    expect(result.properties.name.type).toBe('string');
    expect(result.properties.name.description).toBe('A name');
  });

  it('adds markdownDescription alongside description', () => {
    const base = {
      type: 'object',
      properties: { version: { type: 'number', description: 'Version' } },
    };
    const result = enrichSchema(base, {
      'properties.version': {
        markdownDescription: '**Version** `1`',
      },
    });
    expect(result.properties.version.markdownDescription).toContain(
      '**Version**',
    );
    expect(result.properties.version.description).toBe('Version');
  });

  it('adds enumDescriptions', () => {
    const base = { type: 'string', enum: ['web', 'server'] };
    const result = enrichSchema(base, {
      '': { enumDescriptions: ['Browser platform', 'Node.js platform'] },
    });
    expect(result.enumDescriptions).toEqual([
      'Browser platform',
      'Node.js platform',
    ]);
  });

  it('does not mutate the original schema', () => {
    const base = { type: 'object', properties: { x: { type: 'string' } } };
    const clone = JSON.parse(JSON.stringify(base));
    enrichSchema(base, {
      'properties.x': { markdownDescription: 'test' },
    });
    expect(base).toEqual(clone);
  });

  it('handles nested paths through $defs', () => {
    const base = {
      $defs: {
        Config: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      },
    };
    const result = enrichSchema(base, {
      '$defs.Config.properties.name': { markdownDescription: 'Config name' },
    });
    expect(result.$defs.Config.properties.name.markdownDescription).toBe(
      'Config name',
    );
  });

  it('ignores paths that do not exist', () => {
    const base = { type: 'object' };
    const result = enrichSchema(base, {
      'properties.nonexistent': { markdownDescription: 'nope' },
    });
    expect(result).toEqual({ type: 'object' });
  });
});
