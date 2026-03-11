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
    expect((result.properties as any).data.required).toEqual(['id', 'name']);
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
  it('should resolve a single contract with no extends', () => {
    const contract: Flow.Contract = {
      default: {
        globals: { required: ['country'] },
        events: {
          product: { view: { properties: { data: { required: ['id'] } } } },
        },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.default.globals).toEqual({ required: ['country'] });
    expect(resolved.default.events?.product.view).toBeDefined();
  });

  it('should resolve extends chain', () => {
    const contract: Flow.Contract = {
      default: {
        tagging: 1,
        globals: { required: ['country'] },
        consent: { required: ['analytics'] },
      },
      web: {
        extends: 'default',
        events: {
          product: { view: {} },
        },
      },
    };
    const resolved = resolveContracts(contract);
    // web inherits from default
    expect(resolved.web.tagging).toBe(1);
    expect(resolved.web.globals).toEqual({ required: ['country'] });
    expect(resolved.web.consent).toEqual({ required: ['analytics'] });
    expect(resolved.web.events?.product.view).toBeDefined();
  });

  it('should resolve deep extends chain', () => {
    const contract: Flow.Contract = {
      default: { consent: { required: ['analytics'] } },
      web: {
        extends: 'default',
        events: { product: { view: {} } },
      },
      web_loggedin: {
        extends: 'web',
        user: { required: ['id'] },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web_loggedin.consent).toEqual({ required: ['analytics'] });
    expect(resolved.web_loggedin.events?.product.view).toBeDefined();
    expect(resolved.web_loggedin.user).toEqual({ required: ['id'] });
  });

  it('should detect circular extends', () => {
    const contract: Flow.Contract = {
      a: { extends: 'b' },
      b: { extends: 'a' },
    };
    expect(() => resolveContracts(contract)).toThrow(/circular/i);
  });

  it('should detect self-referencing extends', () => {
    const contract: Flow.Contract = {
      web: { extends: 'web' },
    };
    expect(() => resolveContracts(contract)).toThrow(/circular/i);
  });

  it('should throw for extends referencing non-existent contract', () => {
    const contract: Flow.Contract = {
      web: { extends: 'nonExistent' },
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
    expect(
      (resolved.web.events?.product.add as any).properties.data.required,
    ).toEqual(['id', 'qty']);
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
    expect(
      (resolved.web.events?.product.view as any).properties.consent.required,
    ).toEqual(['analytics']);
    expect(
      (resolved.web.events?.product.view as any).properties.data.required,
    ).toEqual(['id']);
  });

  it('should resolve extends before wildcards', () => {
    const contract: Flow.Contract = {
      default: {
        events: {
          product: {
            '*': { properties: { data: { required: ['id'] } } },
          },
        },
      },
      web: {
        extends: 'default',
        events: {
          product: {
            add: { properties: { data: { required: ['qty'] } } },
          },
        },
      },
    };
    const resolved = resolveContracts(contract);
    // web inherits product.* from default, then add merges with *
    expect(
      (resolved.web.events?.product.add as any).properties.data.required,
    ).toEqual(['id', 'qty']);
  });

  it('should merge sections additively via extends', () => {
    const contract: Flow.Contract = {
      default: {
        consent: { required: ['analytics'] },
      },
      web: {
        extends: 'default',
        consent: { required: ['marketing'] },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.web.consent?.required).toEqual(['analytics', 'marketing']);
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
    // event-level annotations stripped
    const view = resolved.web.events?.product.view as any;
    expect(view.description).toBeUndefined();
    expect(view.examples).toBeUndefined();
    expect(view.properties.data.required).toEqual(['id']);
  });

  it('should handle contract with only sections, no events', () => {
    const contract: Flow.Contract = {
      consent_only: {
        consent: {
          required: ['analytics'],
          properties: { analytics: { type: 'boolean' } },
        },
      },
    };
    const resolved = resolveContracts(contract);
    expect(resolved.consent_only.consent?.required).toEqual(['analytics']);
    expect(resolved.consent_only.events).toBeUndefined();
  });
});
