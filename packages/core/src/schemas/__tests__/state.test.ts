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
        key: 'user.session',
        value: 'data.gclid',
      }).success,
    ).toBe(true);
  });

  it('accepts a valid set', () => {
    expect(
      StateSchema.safeParse({
        mode: 'set',
        key: 'user.session',
        value: 'data.gclid',
      }).success,
    ).toBe(true);
  });

  it('accepts a get with a ValueConfig key path', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'user.session',
        value: { key: 'data.gclid' },
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid mode', () => {
    expect(
      StateSchema.safeParse({
        mode: 'delete',
        key: 'user.session',
        value: 'data.gclid',
      }).success,
    ).toBe(false);
  });

  it('rejects a get with no value', () => {
    expect(
      StateSchema.safeParse({ mode: 'get', key: 'user.session' }).success,
    ).toBe(false);
  });

  it('rejects a set with no value', () => {
    expect(
      StateSchema.safeParse({ mode: 'set', key: 'user.session' }).success,
    ).toBe(false);
  });

  it('rejects a get whose value is a pure constant (no path)', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'user.session',
        value: { value: 'static' },
      }).success,
    ).toBe(false);
  });

  it('rejects a get whose value path contains a wildcard', () => {
    expect(
      StateSchema.safeParse({
        mode: 'get',
        key: 'user.session',
        value: 'data.*',
      }).success,
    ).toBe(false);
  });
});

describe('state appears on the three step configs', () => {
  const single = {
    mode: 'get' as const,
    key: 'user.session',
    value: 'data.gclid',
  };
  const arr = [
    single,
    { mode: 'set' as const, key: 'user.session', value: 'data.gclid' },
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
