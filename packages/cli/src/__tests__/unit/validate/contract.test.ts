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
        extends: 'default',
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

  it('should silently accept legacy tagging field (deprecated, ignored)', () => {
    // tagging was a v3 field; v4 contracts no longer carry it. Existing
    // configs with `tagging` should still validate without error.
    const result = validateContract({
      web: { tagging: 1 },
    });
    expect(result.valid).toBe(true);
  });

  it('should report error for extends referencing non-existent contract', () => {
    const result = validateContract({
      web: { extends: 'nonExistent' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_EXTENDS');
  });

  it('should report error for circular extends', () => {
    const result = validateContract({
      a: { extends: 'b' },
      b: { extends: 'a' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('CIRCULAR_EXTENDS');
  });

  it('should report error for self-referencing extends', () => {
    const result = validateContract({
      web: { extends: 'web' },
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

  it('should validate deep extends chain', () => {
    const result = validateContract({
      default: { consent: { required: ['analytics'] } },
      web: { extends: 'default', events: { product: { view: {} } } },
      web_loggedin: { extends: 'web', user: { required: ['id'] } },
    });
    expect(result.valid).toBe(true);
    expect(result.details.contractCount).toBe(3);
  });
});
