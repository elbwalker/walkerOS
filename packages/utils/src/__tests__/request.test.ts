import { requestToData, requestToParameter } from '../core';

describe('request', () => {
  test('requestToData', async () => {
    expect(
      requestToData(
        'a=z&b=0&c=1&d=true&e=false&f=&g=undefined&h=1.1&i%5B0%5D=1&i%5B1%5D=2&j%5Bx%5D=1&j%5By%5D=2',
      ),
    ).toStrictEqual({
      a: 'z',
      b: 0,
      c: 1,
      d: true,
      e: false,
      f: '',
      g: 'undefined',
      h: 1.1,
      i: [1, 2],
      j: { x: 1, y: 2 },
    });
  });

  test('requestToParameter', async () => {
    expect(
      requestToParameter({
        a: 'z',
        b: 0,
        c: 1,
        d: true,
        e: false,
        f: '',
        g: 'undefined',
        h: 1.1,
        i: [1, 2],
        j: { x: 1, y: 2 },
      }),
    ).toBe(
      'a=z&b=0&c=1&d=true&e=false&g=undefined&h=1.1&i%5B0%5D=1&i%5B1%5D=2&j%5Bx%5D=1&j%5By%5D=2',
    );
  });
});
