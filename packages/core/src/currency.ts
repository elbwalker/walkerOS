/**
 * The alphabetic ISO 4217 currency codes by their minor unit (the number of
 * decimal places), from list one of the ISO 4217 maintenance agency, published
 * 2026-09-17:
 * https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml
 * Codes the list gives no minor unit (N.A., such as XAU or XDR) are left out.
 * The table is ISO's, not the runtime's: `Intl.NumberFormat` follows CLDR,
 * which differs for HUF, IDR, COP, PKR, IQD and others.
 */
const CODES_BY_MINOR_UNIT: ReadonlyArray<[number, string]> = [
  [0, 'BIF CLP DJF GNF ISK JPY KMF KRW PYG RWF UGX UYI VND VUV XAF XOF XPF'],
  [
    2,
    `AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BMD BND BOB BOV BRL BSD
    BTN BWP BYN BZD CAD CDF CHE CHF CHW CNY COP COU CRC CUP CVE CZK DKK DOP
    DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GTQ GYD HKD HNL HTG HUF
    IDR ILS INR IRR JMD KES KGS KHR KPW KYD KZT LAK LBP LKR LRD LSL MAD MDL
    MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR
    NZD PAB PEN PGK PHP PKR PLN QAR RON RSD RUB SAR SBD SCR SDG SEK SGD SHP
    SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TOP TRY TTD TWD TZS UAH USD
    USN UYU UZS VED VES WST XAD XCD XCG YER ZAR ZMW ZWG`,
  ],
  [3, 'BHD IQD JOD KWD LYD OMR TND'],
  [4, 'CLF UYW'],
];

// Built on the first lookup, not at load, so a bundle that never looks up a
// currency (walker.js) drops the table.
let minorUnitsByCode: Map<string, number> | undefined;

const buildMinorUnits = (): Map<string, number> =>
  new Map(
    CODES_BY_MINOR_UNIT.flatMap(([minorUnits, codes]) =>
      codes
        .split(/\s+/)
        .filter(Boolean)
        .map((code): [string, number] => [code, minorUnits]),
    ),
  );

/**
 * The ISO 4217 minor unit of a currency code, in any letter case: 2 for EUR
 * (1 EUR is 100 cents), 0 for JPY, 3 for KWD. A code that is not on the ISO
 * list, or has no minor unit there, gives undefined.
 */
export function getCurrencyMinorUnits(currency: string): number | undefined {
  minorUnitsByCode ??= buildMinorUnits();
  return minorUnitsByCode.get(currency.toUpperCase());
}
