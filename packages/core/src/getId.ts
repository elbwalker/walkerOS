/**
 * Generates a random string of a given length.
 *
 * Draws from the platform CSPRNG (`crypto.getRandomValues`) when available,
 * with rejection sampling to keep the character distribution unbiased. Falls
 * back to `Math.random` only when no secure source is reachable.
 *
 * @param length - The length of the random string.
 * @param charset - Optional custom charset. Defaults to base-36 (0-9a-z).
 * @returns The random string.
 */
const defaultCharset = '0123456789abcdefghijklmnopqrstuvwxyz';

export function getId(length = 6, charset: string = defaultCharset): string {
  const n = charset.length;
  if (length <= 0 || n === 0) return '';

  let str = '';

  // Single-byte charsets can be sampled from the CSPRNG. Reject bytes above the
  // largest multiple of n that fits in a byte so every character is equally likely.
  if (n <= 256) {
    const limit = 256 - (256 % n);
    while (str.length < length) {
      const need = length - str.length;
      const buffer = new Uint8Array(Math.ceil(need * 1.3) + 4);
      if (!secureBytes(buffer)) break; // No secure source, drop to fallback below
      for (let i = 0; i < buffer.length && str.length < length; i++) {
        if (buffer[i] < limit) str += charset[buffer[i] % n];
      }
    }
  }

  // Fallback for a missing CSPRNG or an oversized charset.
  while (str.length < length) str += charset[(Math.random() * n) | 0];

  return str;
}

function secureBytes(buffer: Uint8Array): boolean {
  try {
    const cryptoObj: Crypto | undefined = globalThis.crypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      cryptoObj.getRandomValues(buffer);
      return true;
    }
  } catch {
    // Secure source unavailable, signal the caller to use the fallback.
  }
  return false;
}
