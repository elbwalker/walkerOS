import { resolveContract, mergeContractSchemas } from '../contract';

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
});
