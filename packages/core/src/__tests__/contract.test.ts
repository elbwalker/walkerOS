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

    // Default path still strips annotations.
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

  it('keeps a data key named like an annotation, with its constraints', () => {
    // `data-elb-product="title:Tee"` is ordinary markup, so `title` is one of
    // the most common data keys there is. Its schema is a constraint, not an
    // annotation, and must survive resolution intact.
    const contract: Flow.Contract = {
      web: {
        events: {
          product: {
            view: {
              properties: {
                data: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string', enum: ['Tee', 'Ruck'] },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const data = (
      (resolved.web.events?.product.view as Record<string, unknown>)
        .properties as Record<string, unknown>
    ).data as Record<string, unknown>;
    expect(data.required).toEqual(['title']);
    expect(data.properties).toEqual({
      title: { type: 'string', enum: ['Tee', 'Ruck'] },
      description: { type: 'string' },
    });
  });

  it('should strip a description that annotates a property schema', () => {
    const contract: Flow.Contract = {
      web: {
        events: {
          product: {
            view: {
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'The SKU',
                      $comment: 'internal',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const data = (
      (resolved.web.events?.product.view as Record<string, unknown>)
        .properties as Record<string, unknown>
    ).data as Record<string, unknown>;
    expect(data.properties).toEqual({ id: { type: 'string' } });
  });

  it('applies both rules at any nesting depth', () => {
    const contract: Flow.Contract = {
      web: {
        events: {
          order: {
            complete: {
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      description: 'Line items',
                      items: {
                        type: 'object',
                        properties: {
                          title: {
                            type: 'string',
                            description: 'Product name',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const data = (
      (resolved.web.events?.order.complete as Record<string, unknown>)
        .properties as Record<string, unknown>
    ).data as Record<string, unknown>;
    // The deep `title` data key survives; both `description` keywords go.
    expect(data.properties).toEqual({
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: { title: { type: 'string' } },
        },
      },
    });
  });

  it.each([
    [
      '$defs',
      { $defs: { title: { type: 'string', enum: ['Tee'] } } },
      { $defs: { title: { type: 'string', enum: ['Tee'] } } },
    ],
    [
      'patternProperties',
      { patternProperties: { title: { type: 'string' } } },
      { patternProperties: { title: { type: 'string' } } },
    ],
    [
      'dependentRequired',
      { dependentRequired: { title: ['sku'] } },
      { dependentRequired: { title: ['sku'] } },
    ],
    [
      'dependencies',
      { dependencies: { title: ['sku'], description: { required: ['sku'] } } },
      { dependencies: { title: ['sku'], description: { required: ['sku'] } } },
    ],
    [
      'dependentSchemas',
      { dependentSchemas: { title: { required: ['sku'] } } },
      { dependentSchemas: { title: { required: ['sku'] } } },
    ],
    [
      'const carrying instance data',
      { const: { title: 'Tee', description: 'A shirt' } },
      { const: { title: 'Tee', description: 'A shirt' } },
    ],
    [
      'default carrying instance data',
      { default: { title: 'Tee' } },
      { default: { title: 'Tee' } },
    ],
    [
      'enum carrying instance data',
      { enum: [{ title: 'Tee' }] },
      { enum: [{ title: 'Tee' }] },
    ],
  ])(
    'keeps author-owned names and values under %s',
    (_keyword, authored, expected) => {
      const contract: Flow.Contract = {
        web: { events: { product: { view: authored } } },
      };
      const resolved = resolveContracts(contract);
      expect(resolved.web.events?.product.view).toEqual(expected);
    },
  );

  it('never touches the contents of an unknown or vendor keyword', () => {
    // Anything outside the spec-defined schema positions belongs to the
    // author or a vendor extension. Its contents are opaque: a `title` in
    // there is not an annotation of any schema.
    const contract: Flow.Contract = {
      web: {
        events: {
          product: {
            view: {
              'x-tagging': {
                title: 'Click trigger',
                description: 'Vendor config, not a schema',
              },
              properties: {
                data: {
                  type: 'object',
                  metaHints: { title: 'kept', nested: { $comment: 'kept' } },
                },
              },
            },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web.events?.product.view).toEqual({
      'x-tagging': {
        title: 'Click trigger',
        description: 'Vendor config, not a schema',
      },
      properties: {
        data: {
          type: 'object',
          metaHints: { title: 'kept', nested: { $comment: 'kept' } },
        },
      },
    });
  });

  it.each([
    [
      'allOf',
      { allOf: [{ title: 'Base', required: ['id'] }] },
      { allOf: [{ required: ['id'] }] },
    ],
    [
      'anyOf',
      { anyOf: [{ description: 'Branch', minProperties: 1 }] },
      { anyOf: [{ minProperties: 1 }] },
    ],
    [
      'oneOf',
      { oneOf: [{ $comment: 'Variant', type: 'string' }] },
      { oneOf: [{ type: 'string' }] },
    ],
    [
      'prefixItems',
      { prefixItems: [{ title: 'First', type: 'string' }] },
      { prefixItems: [{ type: 'string' }] },
    ],
    [
      'items tuple form',
      { items: [{ title: 'First', type: 'string' }, { type: 'number' }] },
      { items: [{ type: 'string' }, { type: 'number' }] },
    ],
  ])(
    'strips annotations from each schema element under %s',
    (_keyword, authored, expected) => {
      const contract: Flow.Contract = {
        web: { events: { product: { view: authored } } },
      };
      const resolved = resolveContracts(contract);
      expect(resolved.web.events?.product.view).toEqual(expected);
    },
  );

  it('keeps data keys while stripping annotations inside combinator branches', () => {
    const contract: Flow.Contract = {
      web: {
        events: {
          product: {
            view: {
              properties: {
                data: {
                  allOf: [
                    {
                      title: 'Base shape',
                      required: ['title'],
                      properties: {
                        title: { type: 'string', description: 'Product name' },
                      },
                    },
                    { anyOf: [{ $comment: 'branch', minProperties: 1 }] },
                  ],
                },
              },
            },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    const data = (
      (resolved.web.events?.product.view as Record<string, unknown>)
        .properties as Record<string, unknown>
    ).data as Record<string, unknown>;
    expect(data).toEqual({
      allOf: [
        {
          required: ['title'],
          properties: { title: { type: 'string' } },
        },
        { anyOf: [{ minProperties: 1 }] },
      ],
    });
  });

  it.each([
    [
      'items single-schema form',
      { items: { title: 'Element', type: 'string' } },
      { items: { type: 'string' } },
    ],
    [
      'additionalProperties',
      { additionalProperties: { title: 'Extra', type: 'string' } },
      { additionalProperties: { type: 'string' } },
    ],
    [
      'propertyNames',
      { propertyNames: { description: 'Key format', pattern: '^[a-z]+$' } },
      { propertyNames: { pattern: '^[a-z]+$' } },
    ],
    [
      'contains',
      { contains: { title: 'Member', type: 'number' } },
      { contains: { type: 'number' } },
    ],
    [
      'not',
      { not: { $comment: 'Negation', type: 'null' } },
      { not: { type: 'null' } },
    ],
    [
      'if/then/else',
      {
        if: { title: 'Cond', required: ['id'] },
        then: { description: 'Hit', required: ['name'] },
        else: { $comment: 'Miss', required: ['sku'] },
      },
      {
        if: { required: ['id'] },
        then: { required: ['name'] },
        else: { required: ['sku'] },
      },
    ],
    [
      'boolean-valued schema keyword',
      { additionalProperties: false },
      { additionalProperties: false },
    ],
  ])(
    'strips annotations at the %s schema position',
    (_keyword, authored, expected) => {
      const contract: Flow.Contract = {
        web: { events: { product: { view: authored } } },
      };
      const resolved = resolveContracts(contract);
      expect(resolved.web.events?.product.view).toEqual(expected);
    },
  );

  it('resolves idempotently', () => {
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
            view: {
              description: 'Product viewed',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Product name' },
                  },
                },
              },
            },
          },
        },
      },
    };
    const once = resolveContracts(contract);
    const twice = resolveContracts(once);
    expect(twice).toEqual(once);
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
