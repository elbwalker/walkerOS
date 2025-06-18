import { getHashNode } from '..';

describe('getHash node', () => {
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
    expect(await getHashNode('foo' + 1 + true)).toBe(
      '1a3b5d4a137ed96da9c15abe889877f8a42aa740ef98b9376eeaeb71a081a006',
    );
  });

  test('length', async () => {
    expect(await getHashNode('foo', 2)).toHaveLength(2);
  });
});
