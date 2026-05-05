import { resolveSetup } from '../setup';

describe('resolveSetup', () => {
  test('returns null for false', () => {
    expect(resolveSetup(false, { foo: 1 })).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(resolveSetup(undefined, { foo: 1 })).toBeNull();
  });

  test('returns defaults for true', () => {
    expect(resolveSetup(true, { foo: 1 })).toEqual({ foo: 1 });
  });

  test('merges object onto defaults (shallow)', () => {
    expect(resolveSetup({ bar: 2 }, { foo: 1 })).toEqual({ foo: 1, bar: 2 });
  });

  test('object overrides default keys', () => {
    expect(resolveSetup({ foo: 9 }, { foo: 1 })).toEqual({ foo: 9 });
  });
});
