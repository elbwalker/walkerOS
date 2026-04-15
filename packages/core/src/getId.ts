/**
 * Generates a random string of a given length.
 *
 * @param length - The length of the random string.
 * @param charset - Optional custom charset. Defaults to base-36 (0-9a-z).
 * @returns The random string.
 */
export function getId(length = 6, charset?: string): string {
  if (charset) {
    const n = charset.length;
    let str = '';
    for (let i = 0; i < length; i++) {
      str += charset[(Math.random() * n) | 0];
    }
    return str;
  }

  let str = '';
  for (let l = 36; str.length < length; )
    str += ((Math.random() * l) | 0).toString(l);
  return str;
}
