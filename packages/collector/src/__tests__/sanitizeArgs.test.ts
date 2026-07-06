import { sanitizeArgs } from '../sanitizeArgs';

describe('sanitizeArgs', () => {
  it('replaces non-serializable leaves with stable markers', () => {
    class FakeNode {
      toString(): string {
        return '[object HTMLDivElement]';
      }
    }

    const result = sanitizeArgs([
      () => 1,
      new FakeNode(),
      BigInt(7),
      NaN,
      'ok',
      42,
    ]);

    expect(result).toEqual([
      '[function]',
      '[object HTMLDivElement]',
      '7',
      null,
      'ok',
      42,
    ]);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('marks true cycles but keeps repeated sibling references as copies', () => {
    const shared = { flag: true };
    const cyclic: Record<string, unknown> = { shared };
    cyclic.self = cyclic;
    cyclic.again = shared;

    const result = sanitizeArgs([cyclic]);

    expect(result[0]).toEqual({
      shared: { flag: true },
      self: '[circular]',
      again: { flag: true },
    });
  });

  it('truncates beyond the depth cap and never throws on hostile getters', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 'deep' } } } } } } };
    const hostile: Record<string, unknown> = { ok: 1 };
    Object.defineProperty(hostile, 'boom', {
      enumerable: true,
      get() {
        throw new Error('hostile getter');
      },
    });

    const result = sanitizeArgs([deep, hostile]);

    expect(result[0]).toEqual({
      a: { b: { c: { d: { e: { f: '[truncated]' } } } } },
    });
    expect(result[1]).toEqual({ ok: 1, boom: '[unreadable]' });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
