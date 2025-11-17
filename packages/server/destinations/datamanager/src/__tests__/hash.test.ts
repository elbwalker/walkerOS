import { hashEmail, hashPhone, hashName } from '../hash';
import { getHashServer } from '@walkeros/server-core';

describe('hash utilities', () => {
  describe('hashEmail', () => {
    test('normalizes and hashes email', async () => {
      const email = '  Test@Example.com  ';
      const normalized = 'test@example.com';
      const expected = await getHashServer(normalized);

      const result = await hashEmail(email);
      expect(result).toBe(expected);
    });

    test('removes dots for gmail.com addresses', async () => {
      const email = 'john.doe@gmail.com';
      const normalized = 'johndoe@gmail.com';
      const expected = await getHashServer(normalized);

      const result = await hashEmail(email);
      expect(result).toBe(expected);
    });

    test('removes dots for googlemail.com addresses', async () => {
      const email = 'jane.smith@googlemail.com';
      const normalized = 'janesmith@googlemail.com';
      const expected = await getHashServer(normalized);

      const result = await hashEmail(email);
      expect(result).toBe(expected);
    });

    test('keeps dots for non-gmail addresses', async () => {
      const email = 'user.name@yahoo.com';
      const normalized = 'user.name@yahoo.com';
      const expected = await getHashServer(normalized);

      const result = await hashEmail(email);
      expect(result).toBe(expected);
    });

    test('returns empty string for invalid input', async () => {
      expect(await hashEmail('')).toBe('');
      expect(await hashEmail(null as unknown as string)).toBe('');
      expect(await hashEmail(undefined as unknown as string)).toBe('');
    });
  });

  describe('hashPhone', () => {
    test('formats phone to E.164 and hashes', async () => {
      const phone = '(800) 555-0100';
      const normalized = '+18005550100';
      const expected = await getHashServer(normalized);

      const result = await hashPhone(phone);
      expect(result).toBe(expected);
    });

    test('preserves existing country code', async () => {
      const phone = '+44 20 7946 0958';
      const normalized = '+442079460958';
      const expected = await getHashServer(normalized);

      const result = await hashPhone(phone);
      expect(result).toBe(expected);
    });

    test('adds +1 for US numbers without country code', async () => {
      const phone = '5551234567';
      const normalized = '+15551234567';
      const expected = await getHashServer(normalized);

      const result = await hashPhone(phone);
      expect(result).toBe(expected);
    });

    test('handles various formats', async () => {
      const formats = [
        { input: '555-123-4567', expected: '+15551234567' },
        { input: '(555) 123-4567', expected: '+15551234567' },
        { input: '+1-555-123-4567', expected: '+15551234567' },
        { input: '+49 30 12345678', expected: '+493012345678' },
      ];

      for (const { input, expected } of formats) {
        const result = await hashPhone(input);
        const hash = await getHashServer(expected);
        expect(result).toBe(hash);
      }
    });

    test('returns empty string for invalid input', async () => {
      expect(await hashPhone('')).toBe('');
      expect(await hashPhone(null as unknown as string)).toBe('');
      expect(await hashPhone(undefined as unknown as string)).toBe('');
    });
  });

  describe('hashName', () => {
    test('normalizes and hashes given name', async () => {
      const name = '  John  ';
      const normalized = 'john';
      const expected = await getHashServer(normalized);

      const result = await hashName(name, 'given');
      expect(result).toBe(expected);
    });

    test('removes prefixes from given names', async () => {
      const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Miss.', 'Dr.', 'Prof.'];

      for (const prefix of prefixes) {
        const name = `${prefix} John`;
        const normalized = 'john';
        const expected = await getHashServer(normalized);

        const result = await hashName(name, 'given');
        expect(result).toBe(expected);
      }
    });

    test('removes suffixes from family names', async () => {
      const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

      for (const suffix of suffixes) {
        const name = `Smith ${suffix}`;
        const normalized = 'smith';
        const expected = await getHashServer(normalized);

        const result = await hashName(name, 'family');
        expect(result).toBe(expected);
      }
    });

    test('handles case insensitivity', async () => {
      const names = ['JOHN', 'john', 'JoHn', 'jOhN'];

      const results = await Promise.all(
        names.map((name) => hashName(name, 'given')),
      );

      // All should produce the same hash
      expect(new Set(results).size).toBe(1);
    });

    test('returns empty string for invalid input', async () => {
      expect(await hashName('', 'given')).toBe('');
      expect(await hashName(null as unknown as string, 'given')).toBe('');
      expect(await hashName(undefined as unknown as string, 'given')).toBe('');
    });
  });
});
