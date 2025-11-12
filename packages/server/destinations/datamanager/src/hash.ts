import { isString } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';

/**
 * Normalize email address according to Google Data Manager requirements
 * https://developers.google.com/data-manager/api/devguides/concepts/formatting#email
 *
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. Remove dots (.) for gmail.com and googlemail.com
 * 4. SHA-256 hash
 */
export async function hashEmail(email: string): Promise<string> {
  if (!isString(email) || !email) return '';

  // Trim and lowercase
  let normalized = email.trim().toLowerCase();

  // Remove dots for Gmail addresses
  if (
    normalized.endsWith('@gmail.com') ||
    normalized.endsWith('@googlemail.com')
  ) {
    const [localPart, domain] = normalized.split('@');
    normalized = `${localPart.replace(/\./g, '')}@${domain}`;
  }

  return getHashServer(normalized);
}

/**
 * Normalize phone number to E.164 format and hash
 * https://developers.google.com/data-manager/api/devguides/concepts/formatting#phone
 *
 * E.164 format: +[country code][number] (max 15 digits after +)
 * Example: +18005550100
 *
 * 1. Remove all non-digit characters except leading +
 * 2. Ensure it starts with +
 * 3. SHA-256 hash
 */
export async function hashPhone(phone: string): Promise<string> {
  if (!isString(phone) || !phone) return '';

  // Remove all non-digit characters except + at the start
  let normalized = phone.trim();

  // Extract country code if present
  const hasPlus = normalized.startsWith('+');

  // Remove all non-digits
  normalized = normalized.replace(/\D/g, '');

  // Add + prefix if it was there or if number is long enough
  if (hasPlus || normalized.length > 10) {
    normalized = `+${normalized}`;
  } else {
    // Assume US number if no country code (default behavior)
    normalized = `+1${normalized}`;
  }

  return getHashServer(normalized);
}

/**
 * Normalize and hash a name (first or last name)
 * https://developers.google.com/data-manager/api/devguides/concepts/formatting#name
 *
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. Remove common prefixes (Mr., Mrs., Dr.) for first names
 * 4. Remove common suffixes (Jr., Sr., III) for last names
 * 5. SHA-256 hash
 */
export async function hashName(
  name: string,
  type: 'given' | 'family' = 'given',
): Promise<string> {
  if (!isString(name) || !name) return '';

  // Trim and lowercase
  let normalized = name.trim().toLowerCase();

  // Remove prefixes for given names
  if (type === 'given') {
    const prefixes = ['mr.', 'mrs.', 'ms.', 'miss.', 'dr.', 'prof.'];
    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length).trim();
        break;
      }
    }
  }

  // Remove suffixes for family names (check with and without space)
  // Sort by length (longest first) to match "iii" before "ii"
  if (type === 'family') {
    const suffixes = ['jr.', 'sr.', 'iii', 'ii', 'iv', 'v'];
    for (const suffix of suffixes) {
      // Check for suffix with space before it (e.g., " jr.")
      const suffixWithSpace = ` ${suffix}`;
      if (normalized.endsWith(suffixWithSpace)) {
        normalized = normalized
          .substring(0, normalized.length - suffixWithSpace.length)
          .trim();
        break;
      }
      // Check for suffix without space
      if (normalized.endsWith(suffix)) {
        normalized = normalized
          .substring(0, normalized.length - suffix.length)
          .trim();
        break;
      }
    }
  }

  return getHashServer(normalized);
}

/**
 * Hash multiple email addresses
 */
export async function hashEmails(emails: string[]): Promise<string[]> {
  return Promise.all(emails.map((email) => hashEmail(email)));
}

/**
 * Hash multiple phone numbers
 */
export async function hashPhones(phones: string[]): Promise<string[]> {
  return Promise.all(phones.map((phone) => hashPhone(phone)));
}
