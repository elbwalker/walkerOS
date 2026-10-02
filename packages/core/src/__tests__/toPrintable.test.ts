import { runInNewContext } from 'vm';
import { toPrintable } from '../toPrintable';

class PublishCommand {
  constructor(public readonly input: { Message: string }) {}
}

class TaggedCommand {
  constructor(public readonly input: { Message: string }) {}
  get [Symbol.toStringTag](): string {
    return 'PublishCommand';
  }
}

const cyclic: { self?: unknown } = {};
cyclic.self = cyclic;

const shared = { id: 1 };

function namedFn() {}

describe('toPrintable', () => {
  it.each([
    ['Error', new Error('boom'), { name: 'Error', message: 'boom' }],
    ['TypeError', new TypeError('bad'), { name: 'TypeError', message: 'bad' }],
    ['utf8 Buffer', Buffer.from('{"a":1}'), '{"a":1}'],
    ['non-utf8 bytes', new Uint8Array([0xff, 0xfe]), 'base64://4='],
    ['bigint', BigInt(5), '5'],
    ['cycle', cyclic, { self: '[Circular]' }],
    ['nested Buffer', { data: Buffer.from('x') }, { data: 'x' }],
    ['Map', new Map([['k', BigInt(1)]]), [['k', '1']]],
    ['Set', new Set(['a', 'b']), ['a', 'b']],
    ['function', namedFn, '[Function namedFn]'],
    ['shared reference', [shared, shared], [{ id: 1 }, { id: 1 }]],
    ['Date', new Date(0), '1970-01-01T00:00:00.000Z'],
    [
      'class instance',
      new PublishCommand({ Message: 'hi' }),
      { PublishCommand: { input: { Message: 'hi' } } },
    ],
    ['primitive', 'text', 'text'],
    [
      'a class instance with a toStringTag',
      new TaggedCommand({ Message: 'hi' }),
      { PublishCommand: { input: { Message: 'hi' } } },
    ],
    [
      'null-prototype object',
      Object.assign(Object.create(null), { a: 1 }),
      { a: 1 },
    ],
    [
      'another realm',
      runInNewContext(
        '({ list: new Map([["k", 1]]), err: new Error("x"), plain: { a: 1 } })',
      ),
      {
        list: [['k', 1]],
        err: { name: 'Error', message: 'x' },
        plain: { a: 1 },
      },
    ],
  ])('%s', (_label, input, expected) => {
    expect(toPrintable(input)).toEqual(expected);
  });

  it.each([
    ['ArrayBuffer', new Uint8Array([97, 98]).buffer, 'ab'],
    ['DataView', new DataView(new Uint8Array([99, 100]).buffer), 'cd'],
    ['a view on part of a buffer', Buffer.from('xyz').subarray(1), 'yz'],
  ])('renders the bytes of %s', (_label, input, expected) => {
    expect(toPrintable(input)).toBe(expected);
  });

  it('renders a value with a throwing getter as [Unprintable]', () => {
    const broken = {
      get field(): string {
        throw new Error('nope');
      },
    };
    expect(toPrintable({ ok: 1, broken })).toEqual({
      ok: 1,
      broken: '[Unprintable]',
    });
  });

  it('renders a value with a throwing toJSON as [Unprintable]', () => {
    const broken = {
      toJSON(): never {
        throw new Error('nope');
      },
    };
    expect(toPrintable([broken])).toEqual(['[Unprintable]']);
  });

  it('serializes every supported value without throwing', () => {
    const value = { error: new Error('x'), cycle: cyclic, n: BigInt(9) };
    expect(() => JSON.stringify(toPrintable(value))).not.toThrow();
  });
});
