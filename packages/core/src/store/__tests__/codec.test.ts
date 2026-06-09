import {
  serializeStoreValue,
  deserializeStoreValue,
  StoreCodecError,
} from '../codec';
import type { StoreValue } from '../../types/store';

describe('store codec', () => {
  it('round-trips a value carrying binary bytes as Uint8Array', () => {
    const value: StoreValue = { a: 1, body: new Uint8Array([1, 2, 3]) };
    const restored = deserializeStoreValue(serializeStoreValue(value));

    // Deep value-equality; Jest compares the Uint8Array leaf by bytes.
    expect(restored).toEqual({ a: 1, body: new Uint8Array([1, 2, 3]) });

    // Narrow to read the binary leaf without a cast.
    if (
      typeof restored !== 'object' ||
      restored === null ||
      restored instanceof Uint8Array ||
      Array.isArray(restored)
    ) {
      throw new Error('expected a record');
    }
    const body = restored.body;
    expect(body instanceof Uint8Array).toBe(true);
    if (!(body instanceof Uint8Array)) throw new Error('expected bytes');
    expect(Array.from(body)).toEqual([1, 2, 3]);
  });

  it('preserves a user object that literally carries the reserved marker key', () => {
    const value: StoreValue = {
      __walkeros_cache__: 'buffer',
      d: 'not-really-base64',
      nested: { __walkeros_cache__: 'escape' },
    };
    const restored = deserializeStoreValue(serializeStoreValue(value));
    expect(restored).toEqual(value);
  });

  it('throws a typed, catchable error on a cyclic value', () => {
    // `cyclic` is itself a `StoreValue` (an object record), so assigning it
    // to its own `self` key keeps the value typed as `StoreValue` with no
    // cast while creating a runtime cycle JSON.stringify cannot encode.
    const cyclic: { [key: string]: StoreValue } = {};
    cyclic.self = cyclic;

    expect(() => serializeStoreValue(cyclic)).toThrow(StoreCodecError);
  });

  it('round-trips edge primitives and empty containers', () => {
    const cases: StoreValue[] = [null, '', 0, false, [], {}];
    for (const value of cases) {
      expect(deserializeStoreValue(serializeStoreValue(value))).toEqual(value);
    }
  });

  it('accepts a string raw on deserialize', () => {
    const raw = serializeStoreValue({ hello: 'world' });
    const text = Buffer.from(raw).toString('utf8');
    expect(deserializeStoreValue(text)).toEqual({ hello: 'world' });
  });
});
