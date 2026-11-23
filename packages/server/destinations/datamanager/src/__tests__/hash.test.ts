import {
  hashEmail,
  hashName,
  hashPhone,
  normalizeEmail,
  normalizeFamilyName,
  normalizeGivenName,
  normalizePhone,
  normalizePostalCode,
  normalizeRegionCode,
} from '../hash';

// Sources: "guide" is Google's formatting page; "guide (Ads online
// send-events)" that page's formatting table; "node-util 0.4.1" the output
// of Google's UserDataFormatter; "ours" a walkerOS rule. Google's AddressInfo
// reference says names carry "no punctuation", while its worked example and
// its Node utility keep it; we follow the example and the utility. The
// guide's phone example (800)555-0100 is left out: it presumes the country.
type Row = [input: string, expected: string | undefined, source: string];

describe('hash', () => {
  it.each<Row>([
    [
      'cloudy.sanfrancisco+shopping@gmail.com',
      'cloudysanfrancisco@gmail.com',
      'guide',
    ],
    ['user.name+NYC@Example.com', 'user.name+nyc@example.com', 'guide'],
    [' John.Doe+promo@gmail.com ', 'johndoe@gmail.com', 'node-util 0.4.1'],
    ['a+b@gmail.com', 'a@gmail.com', 'node-util 0.4.1'],
    ['J.Doe@GoogleMail.com', 'jdoe@googlemail.com', 'node-util 0.4.1'],
    [
      'jo hn@example.com',
      'john@example.com',
      'guide ("Trim leading, trailing and intermediate whitespace")',
    ],
    ['no-at-sign.example.com', undefined, 'node-util 0.4.1 (one @)'],
    ['   ', undefined, 'node-util 0.4.1 (blank)'],
  ])('normalizeEmail(%j) is %j: %s', (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  it.each<Row>([
    ['+1 (800) 555-0100', '+18005550100', 'node-util 0.4.1'],
    [
      '+49 170 1234567',
      '+491701234567',
      'guide ("All characters after the plus sign must be digits")',
    ],
    ['0049 30 1234567', '+49301234567', 'ours (ITU 00 prefix)'],
    [
      '+49 (0)30 1234567',
      '+49301234567',
      'ours (a parenthesized (0) after + or 00 is the optional trunk prefix)',
    ],
    ['(800) 555-0100', undefined, 'ours (no country code)'],
    ['030 1234567', undefined, 'ours'],
    ['491701234567', undefined, 'ours (no + or 00)'],
    [
      '+0301234567',
      undefined,
      'ours (E.164 country codes do not start with 0)',
    ],
    ['+1234567890123456', undefined, 'guide (E.164: at most 15 digits)'],
  ])('normalizePhone(%j) is %j: %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each<Row>([
    ['Mrs. Jane', 'jane', 'node-util 0.4.1'],
    [' JOHN ', 'john', 'guide'],
    ['Dr.Who', 'dr.who', 'node-util 0.4.1'],
    [
      'Miss. Ann',
      'miss. ann',
      "node-util 0.4.1 (the guide's 'such as' would drop it)",
    ],
    ['Mr.', undefined, 'node-util 0.4.1 (prefix only)'],
  ])('normalizeGivenName(%j) is %j: %s', (input, expected) => {
    expect(normalizeGivenName(input)).toBe(expected);
  });

  it.each<Row>([
    ['Ivanov', 'ivanov', 'node-util 0.4.1'],
    ['Petrov', 'petrov', 'node-util 0.4.1'],
    ['Aviv', 'aviv', 'node-util 0.4.1'],
    ['Smith V', 'smith', 'node-util 0.4.1'],
    ['Smith Jr', 'smith', 'node-util 0.4.1'],
    ['Smith, Jr.', 'smith', 'node-util 0.4.1'],
    ['Smith PhD', 'smith', 'node-util 0.4.1'],
    ['King Jr. III', 'king', 'node-util 0.4.1'],
    ['Smith-Jones', 'smith-jones', 'guide (Ads online send-events)'],
    ["O'Brien", "o'brien", 'node-util 0.4.1'],
    ['Jr.', undefined, "ours (suffix only; node-util 0.4.1 returns 'jr.')"],
  ])('normalizeFamilyName(%j) is %j: %s', (input, expected) => {
    expect(normalizeFamilyName(input)).toBe(expected);
  });

  it.each<Row>([
    [' de ', 'DE', 'guide (Ads online send-events)'],
    ['DEU', undefined, 'guide (alpha-2)'],
  ])('normalizeRegionCode(%j) is %j: %s', (input, expected) => {
    expect(normalizeRegionCode(input)).toBe(expected);
  });

  it.each<Row>([[' 10115 ', '10115', 'guide']])(
    'normalizePostalCode(%j) is %j: %s',
    (input, expected) => {
      expect(normalizePostalCode(input)).toBe(expected);
    },
  );

  it.each([
    [
      'hashEmail of an address',
      () => hashEmail('Prospect@Example.com'),
      '395ec5f334be0ab5b28568a1e7f6ed5ea80e443fb1ce3d803340586a3df46642',
    ],
    ['hashEmail of a digest', () => hashEmail('A'.repeat(64)), 'a'.repeat(64)],
    ['hashPhone of a digest', () => hashPhone('A'.repeat(64)), 'a'.repeat(64)],
    ['hashPhone without a country code', () => hashPhone('(800) 555-0100'), ''],
    ['hashName of a title only', () => hashName('Mr.'), ''],
    ['hashName of a suffix only', () => hashName('Jr.', 'family'), ''],
  ])('%s', async (_, hash, expected) => {
    expect(await hash()).toBe(expected);
  });
});
