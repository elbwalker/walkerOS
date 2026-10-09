export type Language = 'en' | 'elbish';

const ENGLISH = 'abcdefghijklmnopqrstuvwxyz';
// Vowels rotate a>e>i>o>u>a; consonants shift one step in bcdf...z, z>b.
const ELBISH = 'ecdfighjoklmnpuqrstvawxyzb';

function translate(text: string, from: string, to: string): string {
  let out = '';
  for (const char of text) {
    const lower = char.toLowerCase();
    const index = lower.length === 1 ? from.indexOf(lower) : -1;
    // Only a to z and A to Z map. A character that merely lower-cases to one
    // (İ, the Kelvin sign) passes unchanged, so the round trip holds.
    if (index < 0 || (char !== lower && char !== lower.toUpperCase())) {
      out += char;
      continue;
    }
    const mapped = to.charAt(index);
    out += char === lower ? mapped : mapped.toUpperCase();
  }
  return out;
}

/** English to Elbish: letters a to z by a fixed table, case kept, the rest as is. */
export const elbish = (text: string): string =>
  translate(text, ENGLISH, ELBISH);

/** Elbish back to English: `toEnglish(elbish(text)) === text` for every text. */
export const toEnglish = (text: string): string =>
  translate(text, ELBISH, ENGLISH);
