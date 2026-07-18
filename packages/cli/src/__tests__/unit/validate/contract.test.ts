import { describe, it, expect } from '@jest/globals';
import { validateContract } from '../../../commands/validate/validators/contract.js';

describe('validateContract', () => {
  it('should validate a valid named contract', () => {
    const result = validateContract({
      default: {
        globals: { required: ['country'] },
        consent: { required: ['analytics'] },
      },
      web: {
        extend: 'default',
        events: {
          product: {
            add: { properties: { data: { required: ['id'] } } },
          },
        },
      },
    });
    expect(result.valid).toBe(true);
    expect(result.details.contractCount).toBe(2);
  });

  it('should report error for non-object input', () => {
    const result = validateContract('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_CONTRACT');
  });

  it('should accept a rule-level tagging revision marker', () => {
    // `tagging` is a ContractRule field: a numeric contract revision marker.
    const result = validateContract({
      web: { tagging: 1 },
    });
    expect(result.valid).toBe(true);
  });

  it('should report error for extend referencing non-existent contract', () => {
    const result = validateContract({
      web: { extend: 'nonExistent' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_EXTENDS');
  });

  it('should report error for circular extend', () => {
    const result = validateContract({
      a: { extend: 'b' },
      b: { extend: 'a' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('CIRCULAR_EXTENDS');
  });

  it('should report error for self-referencing extend', () => {
    const result = validateContract({
      web: { extend: 'web' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('CIRCULAR_EXTENDS');
  });

  it('should report error for invalid section type', () => {
    const result = validateContract({
      web: { globals: 'not an object' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_SECTION');
  });

  it('should validate events entity-action structure', () => {
    const result = validateContract({
      web: {
        events: {
          product: {
            '': { properties: {} },
          },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_ACTION_KEY');
  });

  it('should accept contract with only consent', () => {
    const result = validateContract({
      consent_only: {
        consent: { required: ['analytics'] },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should accept empty contract', () => {
    const result = validateContract({});
    expect(result.valid).toBe(true);
    expect(result.details.contractCount).toBe(0);
  });

  it('should accept wildcard entity and action keys', () => {
    const result = validateContract({
      web: {
        events: {
          '*': {
            '*': { properties: { consent: { required: ['analytics'] } } },
          },
          product: {
            '*': { properties: { data: { required: ['id'] } } },
            add: { properties: {} },
          },
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should report error for non-object contract entry', () => {
    const result = validateContract({
      web: 'not an object',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_CONTRACT_ENTRY');
  });

  it('should accept contract with description', () => {
    const result = validateContract({
      web: {
        description: 'Web shop tracking',
        events: {
          product: { view: {} },
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should validate deep extend chain', () => {
    const result = validateContract({
      default: { consent: { required: ['analytics'] } },
      web: { extend: 'default', events: { product: { view: {} } } },
      web_loggedin: { extend: 'web', user: { required: ['id'] } },
    });
    expect(result.valid).toBe(true);
    expect(result.details.contractCount).toBe(3);
  });
});

const actionSchema = {
  properties: { data: { type: 'object', required: ['id'] } },
};

describe('validateContract canonical shape enforcement', () => {
  it('rejects the flat app shape ($-metadata at root)', () => {
    const result = validateContract({
      $tagging: 1,
      product: { view: actionSchema },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FLAT_CONTRACT_SHAPE',
          path: '$tagging',
        }),
      ]),
    );
  });

  it('rejects entries that look like entity-action maps', () => {
    const result = validateContract({ product: { view: actionSchema } });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FLAT_CONTRACT_SHAPE',
          path: 'product',
        }),
      ]),
    );
  });

  it('accepts canonical rules using every ContractRule key', () => {
    const result = validateContract({
      base: {
        description: 'shared model',
        events: { product: { view: actionSchema } },
      },
      web: { extend: 'base', tagging: 2, schema: { type: 'object' } },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('warns on unknown keys next to known ones', () => {
    const result = validateContract({
      web: { events: {}, unexpected: 'value' },
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNKNOWN_CONTRACT_KEY',
          path: 'web.unexpected',
        }),
      ]),
    );
  });

  it('rejects non-number tagging and non-object schema', () => {
    const bad = validateContract({
      web: { events: {}, tagging: 'v2' },
      srv: { events: {}, schema: 'not-a-schema' },
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_TAGGING' }),
        expect.objectContaining({ code: 'INVALID_SCHEMA' }),
      ]),
    );
  });

  it('still accepts an empty rule object', () => {
    expect(validateContract({ default: {} }).valid).toBe(true);
  });
});
