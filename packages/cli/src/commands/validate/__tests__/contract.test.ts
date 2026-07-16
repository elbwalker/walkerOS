import { validateContract } from '../validators/contract';

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
