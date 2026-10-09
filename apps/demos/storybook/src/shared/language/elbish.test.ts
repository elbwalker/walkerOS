import { elbish, toEnglish } from './elbish';

const corpus = [
  'Add to cart',
  'Everyday Ruck Snack',
  'Checkout: 3 items, 249,00 €',
  'MIXED Case words',
  'Grüße aus Hamburg 22767',
  'emoji 🎉 stays',
  'İstanbul at 300 \u212A',
  '',
];

describe('elbish', () => {
  test('maps letters by the fixed table and keeps case', () => {
    expect(elbish('Add to cart')).toBe('Eff vu desv');
    expect(elbish('Elbish')).toBe('Imcotj');
  });

  test('leaves everything that is not a to z unchanged', () => {
    expect(elbish('249,00 € 🎉 ü')).toBe('249,00 € 🎉 ü');
  });

  test.each(corpus)('round trip: %s', (text) => {
    expect(toEnglish(elbish(text))).toBe(text);
  });

  test('maps every letter by the table, in both cases', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    expect(elbish(letters)).toBe('ecdfighjoklmnpuqrstvawxyzb');
    expect(elbish(letters.toUpperCase())).toBe('ECDFIGHJOKLMNPUQRSTVAWXYZB');
  });

  test('the table is a permutation of a to z', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const mapped = elbish(letters);
    expect(new Set(mapped).size).toBe(26);
    expect([...mapped].sort().join('')).toBe(letters);
  });
});
