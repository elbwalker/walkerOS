import { describe, it, expect } from '@jest/globals';
import { validateContract } from '../../../commands/validate/validators/contract.js';

describe('validateContract', () => {
  it('passes valid contract', () => {
    const result = validateContract({
      $tagging: 1,
      product: {
        '*': {
          description: 'A product',
          properties: {
            data: { type: 'object', required: ['id'] },
          },
        },
        add: {
          properties: {
            data: { type: 'object', required: ['qty'] },
          },
        },
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when $tagging is not a positive integer', () => {
    const result = validateContract({
      $tagging: -1,
      product: { view: {} },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_TAGGING' }),
    );
  });

  it('fails when $tagging is a string', () => {
    const result = validateContract({
      $tagging: 'v1',
      product: { view: {} },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_TAGGING' }),
    );
  });

  it('fails when entity key is empty', () => {
    const result = validateContract({
      '': { view: {} },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_ENTITY_KEY' }),
    );
  });

  it('fails when action key is empty', () => {
    const result = validateContract({
      product: { '': { properties: {} } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_ACTION_KEY' }),
    );
  });

  it('fails when entry is not an object', () => {
    const result = validateContract({
      product: { view: 'not-an-object' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_SCHEMA_ENTRY' }),
    );
  });

  it('accepts wildcard entity and action keys', () => {
    const result = validateContract({
      '*': {
        '*': { properties: { consent: { required: ['analytics'] } } },
      },
    });
    expect(result.valid).toBe(true);
  });

  it('reports entity and action counts in details', () => {
    const result = validateContract({
      $tagging: 1,
      product: {
        '*': { properties: {} },
        view: { properties: {} },
        add: { properties: {} },
      },
      order: {
        complete: { properties: {} },
      },
    });
    expect(result.valid).toBe(true);
    expect(result.details.entityCount).toBe(2);
    expect(result.details.actionCount).toBe(4);
    expect(result.details.tagging).toBe(1);
  });

  it('passes empty contract', () => {
    const result = validateContract({});
    expect(result.valid).toBe(true);
  });
});

describe('v2 contract validation', () => {
  it('should validate a valid v2 contract', () => {
    const result = validateContract({
      version: 2,
      $tagging: 1,
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
    });
    expect(result.valid).toBe(true);
    expect(result.details.entityCount).toBe(1);
    expect(result.details.actionCount).toBe(1);
    expect(result.details.sections).toEqual(['globals']);
  });

  it('should report error for invalid section type', () => {
    const result = validateContract({
      version: 2,
      globals: 'not an object',
      events: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_SECTION');
  });

  it('should validate events section like legacy entities', () => {
    const result = validateContract({
      version: 2,
      events: {
        product: {
          '': { properties: {} },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_ACTION_KEY');
  });

  it('should accept v2 with description', () => {
    const result = validateContract({
      version: 2,
      description: 'Web shop tracking',
      events: {
        product: { view: {} },
      },
    });
    expect(result.valid).toBe(true);
  });
});
