import { anonymizeIP } from '../core';

describe('anonymizeIP', () => {
  test('regular', () => {
    expect(anonymizeIP('192.168.1.42')).toStrictEqual('192.168.1.0');
  });
  test('bad ip', () => {
    expect(anonymizeIP('ip.v6.42')).toStrictEqual('');
  });
});
