import { getHash } from '..';

describe('Hash', () => {
  beforeEach(() => {});

  test('regular', async () => {
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn().mockResolvedValue(new Uint8Array([1]).buffer),
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

    expect(await getHash('foo', 1, true)).toBe('01');

    Object.defineProperty(global, 'crypto', {
      value: {},
    });
    Object.defineProperty(global, 'TextEncoder', {
      value: undefined,
    });
  });

  test('undefined', async () => {
    expect(await getHash('foo', 1, true)).toBeUndefined();
  });
});
