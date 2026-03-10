import {
  resolveContract,
  mergeContractSchemas,
  isV2Contract,
  getContractEvents,
  getContractSections,
} from '../contract';
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
    const parent = { minimum: 0 };
    const child = { minimum: 10 };
    const result = mergeContractSchemas(parent, child);
    expect(result.minimum).toBe(10);
  });

  it('should let child override description', () => {
    const parent = { description: 'A product' };
    const child = { description: 'A product in cart' };
    const result = mergeContractSchemas(parent, child);
    expect(result.description).toBe('A product in cart');
  });

  it('should handle parent-only keys', () => {
    const parent = { type: 'object', minimum: 0 };
    const child = { maximum: 100 };
    const result = mergeContractSchemas(parent, child);
    expect(result.type).toBe('object');
    expect(result.minimum).toBe(0);
    expect(result.maximum).toBe(100);
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

describe('resolveContract', () => {
  it('should merge wildcard and specific entries', () => {
    const contract = {
      product: {
        '*': { properties: { data: { type: 'object', required: ['id'] } } },
        add: { properties: { data: { type: 'object', required: ['qty'] } } },
      },
    };
    const result = resolveContract(contract, 'product', 'add');
    expect((result.properties as any).data.required).toEqual(['id', 'qty']);
  });

  it('should merge global wildcard', () => {
    const contract = {
      '*': { '*': { properties: { consent: { required: ['analytics'] } } } },
      product: { view: { properties: { data: { required: ['id'] } } } },
    };
    const result = resolveContract(contract, 'product', 'view');
    expect((result.properties as any).consent.required).toEqual(['analytics']);
    expect((result.properties as any).data.required).toEqual(['id']);
  });

  it('should merge all four wildcard levels', () => {
    const contract = {
      '*': {
        '*': { properties: { consent: { required: ['analytics'] } } },
        view: { properties: { globals: { required: ['page'] } } },
      },
      product: {
        '*': { properties: { data: { required: ['id'] } } },
        view: { properties: { data: { required: ['name'] } } },
      },
    };
    const result = resolveContract(contract, 'product', 'view');
    expect((result.properties as any).consent.required).toEqual(['analytics']);
    expect((result.properties as any).globals.required).toEqual(['page']);
    expect((result.properties as any).data.required).toEqual(['id', 'name']);
  });

  it('should return empty object for unmatched entity-action', () => {
    const contract = {
      product: { view: { properties: { data: { required: ['id'] } } } },
    };
    const result = resolveContract(contract, 'order', 'complete');
    expect(result).toEqual({});
  });

  it('should merge setup and config contracts', () => {
    const setup = {
      product: { '*': { properties: { data: { required: ['id'] } } } },
    };
    const config = {
      product: { add: { properties: { data: { required: ['qty'] } } } },
    };
    const result = resolveContract({ ...setup }, 'product', 'add', config);
    expect((result.properties as any).data.required).toEqual(['id', 'qty']);
  });

  it('should skip $tagging metadata key', () => {
    const contract = {
      $tagging: 3,
      product: { view: { properties: { data: { required: ['id'] } } } },
    } as any;
    const result = resolveContract(contract, 'product', 'view');
    expect((result.properties as any).data.required).toEqual(['id']);
    expect(result.$tagging).toBeUndefined();
  });

  it('should resolve v2 contract from events section', () => {
    const contract: Flow.Contract = {
      version: 2,
      events: {
        product: {
          '*': { properties: { data: { type: 'object', required: ['id'] } } },
          add: { properties: { data: { type: 'object', required: ['qty'] } } },
        },
      },
    };
    const result = resolveContract(contract, 'product', 'add');
    expect((result.properties as any).data.required).toEqual(['id', 'qty']);
  });

  it('should merge v2 top-level sections into resolved event schema', () => {
    const contract: Flow.Contract = {
      version: 2,
      consent: {
        type: 'object',
        required: ['analytics'],
        properties: {
          analytics: { type: 'boolean', const: true },
        },
      },
      events: {
        product: {
          add: {
            properties: {
              data: { required: ['id'] },
            },
          },
        },
      },
    };
    const result = resolveContract(contract, 'product', 'add');
    expect((result.properties as any).consent.required).toEqual(['analytics']);
    expect((result.properties as any).data.required).toEqual(['id']);
  });

  it('should let per-event schemas tighten top-level sections', () => {
    const contract: Flow.Contract = {
      version: 2,
      consent: {
        type: 'object',
        required: ['analytics'],
      },
      events: {
        product: {
          add: {
            properties: {
              consent: {
                required: ['analytics', 'marketing'],
              },
            },
          },
        },
      },
    };
    const result = resolveContract(contract, 'product', 'add');
    expect((result.properties as any).consent.required).toEqual([
      'analytics',
      'marketing',
    ]);
  });

  it('should merge v2 globals into properties.globals', () => {
    const contract: Flow.Contract = {
      version: 2,
      globals: {
        type: 'object',
        required: ['country'],
        properties: {
          country: { type: 'string', pattern: '^[A-Z]{2}$' },
        },
      },
      events: {
        product: {
          view: {
            properties: {
              data: { required: ['id'] },
            },
          },
        },
      },
    };
    const result = resolveContract(contract, 'product', 'view');
    expect((result.properties as any).globals.required).toEqual(['country']);
    expect((result.properties as any).globals.properties.country.type).toBe(
      'string',
    );
    expect((result.properties as any).data.required).toEqual(['id']);
  });

  it('should merge v2 setup and config contracts', () => {
    const setup: Flow.Contract = {
      version: 2,
      globals: {
        type: 'object',
        required: ['country'],
      },
      events: {
        product: {
          '*': { properties: { data: { required: ['id'] } } },
        },
      },
    };
    const config: Flow.Contract = {
      version: 2,
      events: {
        product: {
          add: { properties: { data: { required: ['qty'] } } },
        },
      },
    };
    const result = resolveContract(setup, 'product', 'add', config);
    expect((result.properties as any).globals.required).toEqual(['country']);
    expect((result.properties as any).data.required).toEqual(['id', 'qty']);
  });
});

describe('isV2Contract', () => {
  it('should return true for version 2', () => {
    expect(isV2Contract({ version: 2, events: {} })).toBe(true);
  });

  it('should return false for legacy contract', () => {
    expect(isV2Contract({ $tagging: 1, product: { add: {} } })).toBe(false);
  });

  it('should return false for missing version', () => {
    expect(isV2Contract({ product: { add: {} } })).toBe(false);
  });
});

describe('getContractEvents', () => {
  it('should return events from v2 contract', () => {
    const contract = {
      version: 2,
      globals: { type: 'object' },
      events: { product: { add: { properties: {} } } },
    };
    const events = getContractEvents(contract);
    expect(events).toEqual({ product: { add: { properties: {} } } });
  });

  it('should return flat entity-action map from legacy contract', () => {
    const contract = {
      $tagging: 1,
      product: { add: { properties: {} } },
    };
    const events = getContractEvents(contract);
    expect(events).toEqual({ product: { add: { properties: {} } } });
  });

  it('should exclude metadata keys from legacy contract', () => {
    const contract = {
      $tagging: 1,
      product: { add: {} },
    };
    const events = getContractEvents(contract);
    expect(events.$tagging).toBeUndefined();
  });
});

describe('getContractSections', () => {
  it('should extract all sections from v2 contract', () => {
    const contract = {
      version: 2,
      globals: { type: 'object', required: ['country'] },
      consent: { type: 'object', required: ['analytics'] },
      events: { product: { add: {} } },
    };
    const sections = getContractSections(contract);
    expect(sections.globals).toEqual({ type: 'object', required: ['country'] });
    expect(sections.consent).toEqual({
      type: 'object',
      required: ['analytics'],
    });
    expect(sections.context).toBeUndefined();
    expect(sections.custom).toBeUndefined();
    expect(sections.user).toBeUndefined();
  });

  it('should return empty sections for legacy contract', () => {
    const contract = { $tagging: 1, product: { add: {} } };
    const sections = getContractSections(contract);
    expect(sections.globals).toBeUndefined();
    expect(sections.consent).toBeUndefined();
  });
});

describe('v2 contract type', () => {
  it('should accept v2 contract with sections', () => {
    const contract: Flow.Contract = {
      version: 2,
      $tagging: 1,
      description: 'Test contract',
      globals: {
        type: 'object',
        required: ['country'],
        properties: {
          country: { type: 'string' },
        },
      },
      events: {
        product: {
          add: {
            properties: {
              data: { required: ['id'] },
            },
          },
        },
      },
    };
    // Type check — if this compiles, the type is correct
    expect(contract.version).toBe(2);
    expect(contract.globals).toBeDefined();
    expect(contract.events).toBeDefined();
  });
});
