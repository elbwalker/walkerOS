import { StateSchema } from '../state';
import { ConfigSchema as SourceConfigSchema } from '../source';
import { ConfigSchema as TransformerConfigSchema } from '../transformer';
import { ConfigSchema as DestinationConfigSchema } from '../destination';

describe('StateSchema', () => {
  it('accepts a valid get', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        store: 'sessions',
        key: 'event.user.session',
        value: 'event.data.gclid',
      }).success,
    ).toBe(true);
  });

  it('accepts a valid set', () => {
    expect(
      StateSchema.safeParse({
        mode: 'set',
        key: 'event.user.session',
        value: 'event.data.gclid',
      }).success,
    ).toBe(true);
  });

  it('accepts a get with a ValueConfig key path', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'event.user.session',
        value: { key: 'event.data.gclid' },
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid mode', () => {
    expect(
      StateSchema.safeParse({
        mode: 'delete',
        key: 'event.user.session',
        value: 'event.data.gclid',
      }).success,
    ).toBe(false);
  });

  it('rejects a get with no value', () => {
    expect(
      StateSchema.safeParse({ mode: 'get', key: 'event.user.session' }).success,
    ).toBe(false);
  });

  it('rejects a set with no value', () => {
    expect(
      StateSchema.safeParse({ mode: 'set', key: 'event.user.session' }).success,
    ).toBe(false);
  });

  it('rejects a get whose value is a pure constant (no path)', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'event.user.session',
        value: { value: 'static' },
      }).success,
    ).toBe(false);
  });

  it('rejects a get whose value carries a key plus fn', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'event.user.session',
        value: { key: 'event.data.x', fn: '$code: (e) => e' },
      }).success,
    ).toBe(false);
  });

  it('rejects a get whose value carries a key plus value/map/loop/set', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'event.user.session',
        value: { key: 'event.data.x', value: 'static' },
      }).success,
    ).toBe(false);
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'event.user.session',
        value: { key: 'event.data.x', map: { a: 'b' } },
      }).success,
    ).toBe(false);
  });

  it('rejects a get whose value path contains a wildcard', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'event.user.session',
        value: 'event.data.*',
      }).success,
    ).toBe(false);
  });

  it.each([
    ['a bare key', { mode: 'set', key: 'user.session', value: 'event.data.x' }],
    ['a whole-root key', { mode: 'set', key: 'event', value: 'event.data.x' }],
    ['a bare set value', { mode: 'set', key: 'ingest.site', value: 'data.x' }],
    ['a bare get target', { mode: 'get', key: 'ingest.site', value: 'data.x' }],
    [
      'a bare path in a key fallback list',
      { mode: 'set', key: ['ingest.site', 'user.id'], value: 'event.data.x' },
    ],
    [
      'a prefix with no path',
      { mode: 'set', key: 'ingest.', value: 'event.data.x' },
    ],
  ])('rejects %s', (_, state) => {
    const result = StateSchema.safeParse(state);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(
      'needs an "event." or "ingest." prefix',
    );
  });

  it.each([
    [
      'a whole-root set value',
      { mode: 'set', key: 'ingest.site', value: 'event' },
    ],
    [
      'ingest on both sides',
      { mode: 'get', key: 'ingest.site', value: 'ingest.tenant' },
    ],
    [
      'a set value from fn',
      { mode: 'set', key: 'ingest.site', value: { fn: '$code:() => 1' } },
    ],
    [
      'a set value constant',
      { mode: 'set', key: 'ingest.site', value: { value: 'x' } },
    ],
  ])('accepts %s', (_, state) => {
    expect(StateSchema.safeParse(state).success).toBe(true);
  });
});

describe('state appears on the three step configs', () => {
  const single = {
    mode: 'get' as const,
    key: 'event.user.session',
    value: 'event.data.gclid',
  };
  const arr = [
    single,
    {
      mode: 'set' as const,
      key: 'event.user.session',
      value: 'event.data.gclid',
    },
  ];

  it('SourceConfig accepts state (single and array)', () => {
    expect(SourceConfigSchema.safeParse({ state: single }).success).toBe(true);
    expect(SourceConfigSchema.safeParse({ state: arr }).success).toBe(true);
  });

  it('TransformerConfig accepts state (single and array)', () => {
    expect(TransformerConfigSchema.safeParse({ state: single }).success).toBe(
      true,
    );
    expect(TransformerConfigSchema.safeParse({ state: arr }).success).toBe(
      true,
    );
  });

  it('DestinationConfig accepts state (single and array)', () => {
    expect(DestinationConfigSchema.safeParse({ state: single }).success).toBe(
      true,
    );
    expect(DestinationConfigSchema.safeParse({ state: arr }).success).toBe(
      true,
    );
  });
});

describe('StateSchema mapping', () => {
  it.each([
    [
      'get with a map',
      {
        mode: 'get',
        store: 'customers',
        key: 'event.user.id',
        value: 'event.user',
        mapping: { map: { ltv: 'ltv' } },
      },
    ],
    [
      'get with a string path',
      {
        mode: 'get',
        key: 'event.user.id',
        value: 'event.user.ltv',
        mapping: 'ltv',
      },
    ],
    [
      'get with a fallback list',
      {
        mode: 'get',
        key: 'event.user.id',
        value: 'event.user.segment',
        mapping: [{ key: 'segment' }, { value: 'unknown' }],
      },
    ],
    [
      'set with a map',
      {
        mode: 'set',
        key: 'event.user.id',
        value: 'event.data',
        mapping: { map: { ltv: 'ltv' } },
      },
    ],
  ])('accepts %s and keeps mapping', (_, input) => {
    const result = StateSchema.safeParse(input);
    expect(result.success).toBe(true);
    // zod object schemas strip unknown keys, so success alone proves nothing
    expect(result.success && result.data).toHaveProperty('mapping');
  });

  it('does not prefix-check mapping paths (they are relative to the read value)', () => {
    const result = StateSchema.safeParse({
      mode: 'get',
      key: 'event.user.id',
      value: 'event.user',
      mapping: { map: { ltv: 'profile.ltv' } },
    });
    expect(result.success && result.data).toHaveProperty('mapping');
  });

  it('still requires a key-path value for get', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'event.user.id',
        value: { map: { ltv: 'ltv' } },
        mapping: 'ltv',
      }).success,
    ).toBe(false);
  });
});
