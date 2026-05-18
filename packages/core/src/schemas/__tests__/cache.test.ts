import { EventCacheSchema, StoreCacheSchema } from '../cache';

describe('EventCacheSchema', () => {
  it('rejects rule without key', () => {
    expect(EventCacheSchema.safeParse({ rules: [{ ttl: 60 }] }).success).toBe(
      false,
    );
  });

  it('accepts rule with key and optional update', () => {
    expect(
      EventCacheSchema.safeParse({
        rules: [{ key: ['event.id'], ttl: 60, update: { foo: 'bar' } }],
      }).success,
    ).toBe(true);
  });
});

describe('StoreCacheSchema', () => {
  it('accepts minimal rule with just ttl', () => {
    expect(StoreCacheSchema.safeParse({ rules: [{ ttl: 60 }] }).success).toBe(
      true,
    );
  });

  it('rejects update on rule', () => {
    expect(
      StoreCacheSchema.safeParse({
        rules: [{ ttl: 60, update: { foo: 'bar' } }],
      }).success,
    ).toBe(false);
  });

  it('rejects multi-segment key on rule', () => {
    expect(
      StoreCacheSchema.safeParse({
        rules: [{ ttl: 60, key: ['something'] }],
      }).success,
    ).toBe(false);
  });

  it('rejects stop:true at top level', () => {
    expect(
      StoreCacheSchema.safeParse({
        stop: true,
        rules: [{ ttl: 60 }],
      }).success,
    ).toBe(false);
  });

  it('rejects namespace: ""', () => {
    expect(
      StoreCacheSchema.safeParse({
        namespace: '',
        rules: [{ ttl: 60 }],
      }).success,
    ).toBe(false);
  });
});
