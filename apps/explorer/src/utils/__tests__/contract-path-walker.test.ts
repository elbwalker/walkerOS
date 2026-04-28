import {
  getContractPathCompletions,
  getSchemaPropertyCompletions,
} from '../contract-path-walker';
import type { Flow } from '@walkeros/core';

const sampleContract: Flow.Contract = {
  default: {
    tagging: 1,
    description: 'Base',
    globals: {
      type: 'object',
      properties: { lang: { type: 'string' }, env: { type: 'string' } },
    },
    events: {
      page: {
        view: {
          type: 'object',
          properties: { title: { type: 'string' }, url: { type: 'string' } },
        },
      },
      product: {
        add: {
          type: 'object',
          properties: { id: { type: 'string' }, price: { type: 'number' } },
        },
      },
    },
  },
  web: {
    extends: 'default',
    events: {
      page: {
        view: {
          type: 'object',
          properties: {
            referrer: { type: 'string' },
          },
        },
        read: {
          type: 'object',
          properties: { duration: { type: 'number' } },
        },
      },
    },
  },
};

describe('getContractPathCompletions', () => {
  it('returns contract names at root level', () => {
    const result = getContractPathCompletions(sampleContract, []);
    expect(result.map((r) => r.key)).toEqual(
      expect.arrayContaining(['default', 'web']),
    );
  });

  it('returns top-level keys for a named contract', () => {
    const result = getContractPathCompletions(sampleContract, ['web']);
    const keys = result.map((r) => r.key);
    // After resolution, web inherits default's globals + events
    expect(keys).toEqual(
      expect.arrayContaining(['description', 'globals', 'events']),
    );
    // extends is stripped after resolution
    expect(keys).not.toContain('extends');
  });

  it('returns entity names under events', () => {
    const result = getContractPathCompletions(sampleContract, [
      'web',
      'events',
    ]);
    const keys = result.map((r) => r.key);
    // web inherits page + product from default, adds page.read
    expect(keys).toEqual(expect.arrayContaining(['page', 'product']));
  });

  it('returns action names under entity', () => {
    const result = getContractPathCompletions(sampleContract, [
      'web',
      'events',
      'page',
    ]);
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(['view', 'read']));
  });

  it('returns schema property names under entity.action', () => {
    const result = getContractPathCompletions(sampleContract, [
      'web',
      'events',
      'page',
      'view',
    ]);
    const keys = result.map((r) => r.key);
    // Merged: url from default, referrer from web
    // Note: "title" is stripped by resolveContracts (it's a JSON Schema annotation key)
    expect(keys).toEqual(expect.arrayContaining(['url', 'referrer']));
  });

  it('returns section keys for globals', () => {
    const result = getContractPathCompletions(sampleContract, [
      'default',
      'globals',
    ]);
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(['lang', 'env']));
  });

  it('returns empty array for invalid path', () => {
    const result = getContractPathCompletions(sampleContract, ['nonexistent']);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty contract', () => {
    const result = getContractPathCompletions({}, []);
    expect(result).toEqual([]);
  });
});

describe('getSchemaPropertyCompletions', () => {
  it('extracts property names and types from JSON Schema', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        count: { type: 'number' },
        active: { type: 'boolean' },
      },
    };
    const result = getSchemaPropertyCompletions(schema);
    expect(result).toEqual([
      { key: 'title', type: 'string' },
      { key: 'count', type: 'number' },
      { key: 'active', type: 'boolean' },
    ]);
  });

  it('returns empty for schema without properties', () => {
    expect(getSchemaPropertyCompletions({})).toEqual([]);
    expect(getSchemaPropertyCompletions({ type: 'string' })).toEqual([]);
  });

  it('handles nested object properties', () => {
    const schema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: { street: { type: 'string' } },
        },
      },
    };
    const result = getSchemaPropertyCompletions(schema);
    expect(result).toEqual([{ key: 'address', type: 'object' }]);
  });
});
