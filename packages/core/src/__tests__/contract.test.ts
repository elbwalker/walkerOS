import { resolveContracts, mergeContractSchemas } from '../contract';
import type { Flow } from '../types';

describe('mergeContractSchemas', () => {
  it('should union required arrays', () => {
    const parent = { required: ['id'] };
    const child = { required: ['name'] };
    const result = mergeContractSchemas(parent, child);
    expect(result.required).toEqual(['id', 'name']);
  });

  it('should deduplicate required arrays', () => {
    const parent = { required: ['id', 'name'] };
    const child = { required: ['name', 'price'] };
    const result = mergeContractSchemas(parent, child);
    expect(result.required).toEqual(['id', 'name', 'price']);
  });

  it('should deep merge properties', () => {
    const parent = {
      properties: { data: { type: 'object', required: ['id'] } },
    };
    const child = {
      properties: { data: { type: 'object', required: ['name'] } },
    };
    const result = mergeContractSchemas(parent, child);
    expect(result).toEqual({
      properties: { data: { type: 'object', required: ['id', 'name'] } },
    });
  });

  it('should let child override scalar keywords', () => {
    const result = mergeContractSchemas({ minimum: 0 }, { minimum: 10 });
    expect(result.minimum).toBe(10);
  });

  it('should handle empty parent', () => {
    const result = mergeContractSchemas({}, { required: ['id'] });
    expect(result.required).toEqual(['id']);
  });

  it('should handle empty child', () => {
    const result = mergeContractSchemas({ required: ['id'] }, {});
    expect(result.required).toEqual(['id']);
  });
});

describe('resolveContracts', () => {
  it('should resolve a single contract with no extend', () => {
    const contract: Flow.Contract = {
      default: {
        schema: {
          type: 'object',
          properties: {
            globals: { type: 'object', required: ['country'] },
          },
        },
        events: {
          product: { view: { properties: { data: { required: ['id'] } } } },
        },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.default.schema).toEqual({
      type: 'object',
      properties: {
        globals: { type: 'object', required: ['country'] },
      },
    });
    expect(resolved.default.events?.product.view).toBeDefined();
  });

  it('should resolve extend chain', () => {
    const contract: Flow.Contract = {
      default: {
        schema: {
          type: 'object',
          properties: {
            globals: { type: 'object', required: ['country'] },
            consent: { type: 'object', required: ['analytics'] },
          },
        },
      },
      web: {
        extend: 'default',
        events: {
          product: { view: {} },
        },
      },
    };
    const resolved = resolveContracts(contract);
    // web inherits schema from default
    const webProps = (resolved.web.schema as Record<string, unknown>)
      .properties as Record<string, unknown>;
    expect(webProps.globals).toEqual({ type: 'object', required: ['country'] });
    expect(webProps.consent).toEqual({
      type: 'object',
      required: ['analytics'],
    });
    expect(resolved.web.events?.product.view).toBeDefined();
  });

  it('should resolve deep extend chain', () => {
    const contract: Flow.Contract = {
      default: {
        schema: {
          type: 'object',
          properties: {
            consent: { type: 'object', required: ['analytics'] },
          },
        },
      },
      web: {
        extend: 'default',
        events: { product: { view: {} } },
      },
      web_loggedin: {
        extend: 'web',
        schema: {
          type: 'object',
          properties: {
            user: { type: 'object', required: ['id'] },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const props = (resolved.web_loggedin.schema as Record<string, unknown>)
      .properties as Record<string, unknown>;
    expect(props.consent).toEqual({
      type: 'object',
      required: ['analytics'],
    });
    expect(props.user).toEqual({ type: 'object', required: ['id'] });
    expect(resolved.web_loggedin.events?.product.view).toBeDefined();
  });

  it('should detect circular extend', () => {
    const contract: Flow.Contract = {
      a: { extend: 'b' },
      b: { extend: 'a' },
    };
    expect(() => resolveContracts(contract)).toThrow(/circular/i);
  });

  it('should detect self-referencing extend', () => {
    const contract: Flow.Contract = {
      web: { extend: 'web' },
    };
    expect(() => resolveContracts(contract)).toThrow(/circular/i);
  });

  it('should throw for extend referencing non-existent contract', () => {
    const contract: Flow.Contract = {
      web: { extend: 'nonExistent' },
    };
    expect(() => resolveContracts(contract)).toThrow(/nonExistent/);
  });

  it('should expand wildcards in events', () => {
    const contract: Flow.Contract = {
      web: {
        events: {
          product: {
            '*': { properties: { data: { required: ['id'] } } },
            add: { properties: { data: { required: ['qty'] } } },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    // Wildcard merged into concrete action
    expect(resolved.web.events?.product.add).toEqual({
      properties: { data: { required: ['id', 'qty'] } },
    });
    // Wildcard entry preserved
    expect(resolved.web.events?.product['*']).toBeDefined();
  });

  it('should expand global wildcards (*.*)', () => {
    const contract: Flow.Contract = {
      web: {
        events: {
          '*': {
            '*': { properties: { consent: { required: ['analytics'] } } },
          },
          product: {
            view: { properties: { data: { required: ['id'] } } },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web.events?.product.view).toEqual({
      properties: {
        consent: { required: ['analytics'] },
        data: { required: ['id'] },
      },
    });
  });

  it('should resolve extend before wildcards', () => {
    const contract: Flow.Contract = {
      default: {
        events: {
          product: {
            '*': { properties: { data: { required: ['id'] } } },
          },
        },
      },
      web: {
        extend: 'default',
        events: {
          product: {
            add: { properties: { data: { required: ['qty'] } } },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    // web inherits product.* from default, then add merges with *
    expect(resolved.web.events?.product.add).toEqual({
      properties: { data: { required: ['id', 'qty'] } },
    });
  });

  it('should inherit tagging from parent when child omits it', () => {
    const contract: Flow.Contract = {
      default: {
        tagging: 1,
        schema: {
          type: 'object',
          properties: { globals: { type: 'object', required: ['country'] } },
        },
      },
      web: {
        extend: 'default',
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web.tagging).toBe(1);
  });

  it('should let child tagging override parent tagging', () => {
    const contract: Flow.Contract = {
      default: { tagging: 1 },
      web: { extend: 'default', tagging: 2 },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web.tagging).toBe(2);
  });

  it('should propagate tagging through a multi-level extend chain', () => {
    const contract: Flow.Contract = {
      default: { tagging: 3 },
      web: { extend: 'default' },
      web_loggedin: { extend: 'web' },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web.tagging).toBe(3);
    expect(resolved.web_loggedin.tagging).toBe(3);
  });

  it('should strip annotation keys', () => {
    const contract: Flow.Contract = {
      web: {
        description: 'Web shop',
        events: {
          product: {
            view: {
              description: 'Product viewed',
              examples: [{ data: { id: 'SKU-1' } }],
              properties: { data: { required: ['id'] } },
            },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    // top-level description preserved (it's contract metadata)
    expect(resolved.web.description).toBe('Web shop');
    // event-level annotations stripped — only `properties` remains
    expect(resolved.web.events?.product.view).toEqual({
      properties: { data: { required: ['id'] } },
    });
  });

  it('preserves event-level annotations when stripAnnotations is false', () => {
    const contract: Flow.Contract = {
      web: {
        events: {
          product: {
            view: {
              description: 'Product viewed',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'The SKU' },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Default path still strips annotations (AJV-clean).
    const stripped = resolveContracts(contract);
    expect(stripped.web.events?.product.view).not.toHaveProperty('description');

    // Annotation-preserving view keeps descriptions for IntelliSense.
    const annotated = resolveContracts(contract, { stripAnnotations: false });
    expect(annotated.web.events?.product.view).toMatchObject({
      description: 'Product viewed',
      properties: {
        data: {
          properties: { id: { type: 'string', description: 'The SKU' } },
        },
      },
    });
  });

  it('should handle contract with only schema, no events', () => {
    const contract: Flow.Contract = {
      consent_only: {
        schema: {
          type: 'object',
          properties: {
            consent: {
              type: 'object',
              required: ['analytics'],
              properties: { analytics: { type: 'boolean' } },
            },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const props = (resolved.consent_only.schema as Record<string, unknown>)
      .properties as Record<string, unknown>;
    expect((props.consent as Record<string, unknown>).required).toEqual([
      'analytics',
    ]);
    expect(resolved.consent_only.events).toBeUndefined();
  });

  it('resolves a contract with schema only', () => {
    const contract: Flow.Contract = {
      web: {
        schema: {
          type: 'object',
          properties: {
            globals: { type: 'object', required: ['country'] },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web.schema).toEqual({
      type: 'object',
      properties: {
        globals: { type: 'object', required: ['country'] },
      },
    });
  });

  it('merges schemas additively via extend', () => {
    const contract: Flow.Contract = {
      default: {
        schema: {
          type: 'object',
          properties: { globals: { required: ['country'] } },
        },
      },
      web: {
        extend: 'default',
        schema: {
          type: 'object',
          properties: { consent: { required: ['analytics'] } },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const props = (resolved.web.schema as Record<string, unknown>).properties;
    expect(props).toEqual({
      globals: { required: ['country'] },
      consent: { required: ['analytics'] },
    });
  });

  it('unions required arrays via extend', () => {
    const contract: Flow.Contract = {
      default: {
        schema: {
          type: 'object',
          properties: { globals: { type: 'object', required: ['country'] } },
        },
      },
      web: {
        extend: 'default',
        schema: {
          type: 'object',
          properties: { globals: { type: 'object', required: ['currency'] } },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const globals = (
      (resolved.web.schema as Record<string, unknown>).properties as Record<
        string,
        unknown
      >
    ).globals as Record<string, unknown>;
    expect(globals.required).toEqual(
      expect.arrayContaining(['country', 'currency']),
    );
  });
});
