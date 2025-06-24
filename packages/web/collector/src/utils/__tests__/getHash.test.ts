import { getHashWeb } from '..';

describe('getHash web', () => {
  const orgCrypto = global.crypto;
  const orgTextEncoder = global.TextEncoder;

  beforeEach(() => {
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: (algorithm, data) => {
            return new Uint8Array(data);
          },
        },
      },
    });
    Object.defineProperty(global, 'TextEncoder', {
      value: class {
        encode(input) {
          return new Uint8Array([...Buffer.from(input)]);
        }
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'crypto', {
      value: orgCrypto,
    });
    Object.defineProperty(global, 'TextEncoder', {
      value: orgTextEncoder,
    });
  });

  test('regular', async () => {
    expect(await getHashWeb('foo' + 1 + true)).toBe('666f6f3174727565');
  });

  test('undefined', async () => {
    Object.defineProperty(global, 'crypto', {
      value: {},
    });
    Object.defineProperty(global, 'TextEncoder', {
      value: undefined,
    });

    expect(await getHashWeb('foo' + 1 + true)).toBe('');
  });

  test('length', async () => {
    expect(await getHashWeb('foo', 2)).toHaveLength(2);
  });
});
