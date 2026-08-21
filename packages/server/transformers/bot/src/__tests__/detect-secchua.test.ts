import {
  parseSecChUa,
  parseSecChUaMobile,
  parseSecChUaPlatform,
} from '../detect/secChUa';

describe('parseSecChUa', () => {
  it('parses a real Chrome brand list and filters GREASE', () => {
    expect(
      parseSecChUa(
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      ),
    ).toEqual([
      { brand: 'Chromium', version: '124' },
      { brand: 'Google Chrome', version: '124' },
    ]);
  });

  it('parses an Edge brand list with GREASE first', () => {
    expect(
      parseSecChUa(
        '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
      ),
    ).toEqual([
      { brand: 'Chromium', version: '120' },
      { brand: 'Microsoft Edge', version: '120' },
    ]);
  });

  it('parses an Opera brand list with GREASE in the middle', () => {
    expect(
      parseSecChUa('"Opera";v="81", " Not;A Brand";v="99", "Chromium";v="95"'),
    ).toEqual([
      { brand: 'Opera', version: '81' },
      { brand: 'Chromium', version: '95' },
    ]);
  });

  it.each([
    ['" Not A;Brand";v="99", "Chromium";v="96"'],
    ['"Not(A:Brand";v="8", "Chromium";v="98"'],
    ['"Not_A Brand";v="8", "Chromium";v="120"'],
    ['"Not/A)Brand";v="8", "Chromium";v="126"'],
    ['"Not.A/Brand";v="24", "Chromium";v="130"'],
    ['"Not:A-Brand";v="99", "Chromium";v="133"'],
  ])('filters GREASE rotation %s', (header) => {
    expect(parseSecChUa(header).map((b) => b.brand)).toEqual(['Chromium']);
  });

  it.each([
    ['', []],
    ['garbage', []],
    ['"Unclosed;v="1"', []],
    ['"Chromium"', [{ brand: 'Chromium', version: '' }]],
  ])('handles malformed or minimal input %s', (header, expected) => {
    expect(parseSecChUa(header)).toEqual(expected);
  });
});

describe('parseSecChUaMobile', () => {
  it.each([
    ['?0', false],
    ['?1', true],
    ['', undefined],
    ['yes', undefined],
  ])('%s -> %s', (header, expected) => {
    expect(parseSecChUaMobile(header)).toBe(expected);
  });
});

describe('parseSecChUaPlatform', () => {
  it.each([
    ['"macOS"', 'macOS'],
    ['"Windows"', 'Windows'],
    ['"Android"', 'Android'],
    ['', undefined],
    ['macOS', undefined],
  ])('%s -> %s', (header, expected) => {
    expect(parseSecChUaPlatform(header)).toBe(expected);
  });
});
