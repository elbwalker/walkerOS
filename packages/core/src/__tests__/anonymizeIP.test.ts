import { anonymizeIP } from '..';

describe('anonymizeIP', () => {
  test.each([
    ['IPv4 keeps /24', '192.168.1.42', '192.168.1.0'],
    ['IPv4-mapped IPv6 is IPv4', '::ffff:192.168.1.42', '192.168.1.0'],
    ['IPv4-mapped in upper case', '::FFFF:192.168.1.42', '192.168.1.0'],
    [
      'IPv6 full form keeps /48',
      '2001:0db8:abcd:0012:0000:0000:0000:0007',
      '2001:db8:abcd::',
    ],
    ['IPv6 compressed form', '2001:db8:abcd:12::7', '2001:db8:abcd::'],
    ['IPv6 upper case', '2001:DB8:ABCD:12::7', '2001:db8:abcd::'],
    ['IPv6 zeros inside the /48', '2001::1', '2001:0:0::'],
    ['IPv6 all compressed', '::1', '0:0:0::'],
    ['bad ip', 'ip.v6.42', ''],
    ['empty', '', ''],
    ['X-Forwarded-For list', '1.2.3.4, 10.0.0.1', ''],
    ['two :: in one address', '2001::db8::1', ''],
    ['nine groups', '1:2:3:4:5:6:7:8:9', ''],
    ['seven groups without ::', '1:2:3:4:5:6:7', ''],
    ['group longer than four digits', '2001:db8a1::1', ''],
    ['non-hex group', '2001:db8:xyz::1', ''],
  ])('%s', (_, ip, expected) => {
    expect(anonymizeIP(ip)).toBe(expected);
  });

  test('two spellings of one /48 give one value, another /48 differs', () => {
    const value = anonymizeIP('2a02:8108:1dc0:abcd:1234:5678:9abc:def0');
    expect(anonymizeIP('2a02:8108:1dc0::1')).toBe(value);
    expect(anonymizeIP('2a02:8108:1dc1::1')).not.toBe(value);
  });
});
