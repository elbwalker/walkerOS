import { getCurrencyMinorUnits } from '..';

describe('getCurrencyMinorUnits', () => {
  // The first sixteen are the codes where CLDR (Intl.NumberFormat) differs
  // from ISO 4217; the rest pin codes with 0, 2, 3 and 4 decimal places.
  it.each<[string, number]>([
    ['AFN', 2],
    ['ALL', 2],
    ['COP', 2],
    ['HUF', 2],
    ['IDR', 2],
    ['IQD', 3],
    ['IRR', 2],
    ['KPW', 2],
    ['LAK', 2],
    ['LBP', 2],
    ['MGA', 2],
    ['MMK', 2],
    ['PKR', 2],
    ['SOS', 2],
    ['SYP', 2],
    ['YER', 2],
    ['JPY', 0],
    ['KRW', 0],
    ['CLP', 0],
    ['EUR', 2],
    ['USD', 2],
    ['XCG', 2],
    ['KWD', 3],
    ['BHD', 3],
    ['TND', 3],
    ['CLF', 4],
    ['eur', 2],
  ])('%s has %i decimal places', (currency, minorUnits) => {
    expect(getCurrencyMinorUnits(currency)).toBe(minorUnits);
  });

  it.each([
    ['a code without a minor unit', 'XAU'],
    ['a code no longer on the list', 'HRK'],
    ['a made-up code', 'XYZ'],
    ['a name', 'EURO'],
    ['an empty string', ''],
    ['an object key', 'constructor'],
  ])('gives undefined for %s', (_, currency) => {
    expect(getCurrencyMinorUnits(currency)).toBeUndefined();
  });
});
