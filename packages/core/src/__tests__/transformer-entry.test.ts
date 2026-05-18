import {
  validateTransformerEntry,
  isPathTransformerEntry,
  TRANSFORMER_OPERATIVE_FIELDS,
} from '../transformer-entry';

describe('validateTransformerEntry', () => {
  it('accepts an entry with code only', () => {
    expect(validateTransformerEntry({ code: () => {} }).ok).toBe(true);
  });

  it('accepts an entry with package only', () => {
    expect(validateTransformerEntry({ package: '@walkeros/x' }).ok).toBe(true);
  });

  it('accepts a path entry with before only', () => {
    expect(validateTransformerEntry({ before: ['a'] }).ok).toBe(true);
  });

  it('accepts a path entry with cache only', () => {
    expect(validateTransformerEntry({ cache: { rules: [] } }).ok).toBe(true);
  });

  it('accepts a pass-through entry with mapping only', () => {
    expect(validateTransformerEntry({ mapping: {} }).ok).toBe(true);
  });

  it('accepts an empty entry (pass-through is the default; no harm)', () => {
    expect(validateTransformerEntry({}).ok).toBe(true);
  });

  it('accepts an entry with only `validate` (in-built validate hook)', () => {
    expect(validateTransformerEntry({ validate: () => true }).ok).toBe(true);
  });

  it('accepts an entry with examples alongside package', () => {
    // `examples` is a legitimate top-level field on Flow.Transformer
    // (named scenarios for testing/documentation). It must not be flagged
    // as UNKNOWN_KEY by the closed-schema check.
    expect(
      validateTransformerEntry({
        package: '@walkeros/x',
        examples: { pass: { in: {}, out: {} } },
      }).ok,
    ).toBe(true);
  });

  it('accepts an entry with variables alongside package', () => {
    // `variables` is a legitimate top-level field on Flow.Transformer
    // (transformer-scoped variable cascade). It must not be flagged.
    expect(
      validateTransformerEntry({
        package: '@walkeros/x',
        variables: { FOO: 'bar' },
      }).ok,
    ).toBe(true);
  });

  it('rejects an entry with unknown keys', () => {
    const r = validateTransformerEntry({ code: () => {}, rules: [] });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('UNKNOWN_KEY');
    expect(r.key).toBe('rules');
  });

  it('rejects an entry with both code and package (conflict)', () => {
    const r = validateTransformerEntry({
      code: () => {},
      package: '@walkeros/x',
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CONFLICT');
  });

  it('exposes the operative fields list', () => {
    expect(TRANSFORMER_OPERATIVE_FIELDS).toEqual([
      'code',
      'package',
      'before',
      'next',
      'cache',
      'mapping',
    ]);
  });
});

describe('isPathTransformerEntry', () => {
  it('returns false when code is present', () => {
    expect(isPathTransformerEntry({ code: () => {} })).toBe(false);
  });

  it('returns false when package is present', () => {
    expect(isPathTransformerEntry({ package: '@walkeros/x' })).toBe(false);
  });

  it('returns true for a mapping-only entry', () => {
    expect(isPathTransformerEntry({ mapping: {} })).toBe(true);
  });

  it('returns true for a before-only entry', () => {
    expect(isPathTransformerEntry({ before: ['a'] })).toBe(true);
  });

  it('returns false for an empty entry', () => {
    expect(isPathTransformerEntry({})).toBe(false);
  });
});
