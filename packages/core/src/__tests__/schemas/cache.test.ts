import { CacheSchema, CacheRuleSchema } from '../../schemas/cache';

describe('CacheRuleSchema', () => {
  it('validates a rule with match, key, ttl', () => {
    expect(
      CacheRuleSchema.safeParse({
        match: { key: 'ingest.method', operator: 'eq', value: 'GET' },
        key: ['ingest.method', 'ingest.path'],
        ttl: 300,
      }).success,
    ).toBe(true);
  });

  it('validates wildcard match', () => {
    expect(
      CacheRuleSchema.safeParse({
        match: '*',
        key: ['ingest.path'],
        ttl: 60,
      }).success,
    ).toBe(true);
  });

  it('validates rule with update', () => {
    expect(
      CacheRuleSchema.safeParse({
        match: '*',
        key: ['ingest.path'],
        ttl: 60,
        update: { 'headers.X-Cache': { value: 'HIT' } },
      }).success,
    ).toBe(true);
  });

  it('rejects missing ttl', () => {
    expect(
      CacheRuleSchema.safeParse({
        match: '*',
        key: ['ingest.path'],
      }).success,
    ).toBe(false);
  });

  it('rejects missing key', () => {
    expect(
      CacheRuleSchema.safeParse({
        match: '*',
        ttl: 60,
      }).success,
    ).toBe(false);
  });
});

describe('CacheSchema', () => {
  it('validates minimal cache config', () => {
    expect(
      CacheSchema.safeParse({
        rules: [{ match: '*', key: ['ingest.path'], ttl: 60 }],
      }).success,
    ).toBe(true);
  });

  it('validates with store', () => {
    expect(
      CacheSchema.safeParse({
        store: 'myCache',
        rules: [{ match: '*', key: ['ingest.path'], ttl: 300 }],
      }).success,
    ).toBe(true);
  });

  it('validates with full flag', () => {
    expect(
      CacheSchema.safeParse({
        full: true,
        rules: [{ match: '*', key: ['ingest.path'], ttl: 60 }],
      }).success,
    ).toBe(true);
  });

  it('validates without full flag', () => {
    const result = CacheSchema.safeParse({
      rules: [{ match: '*', key: ['ingest.path'], ttl: 60 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty rules array', () => {
    expect(
      CacheSchema.safeParse({
        rules: [],
      }).success,
    ).toBe(false);
  });
});
