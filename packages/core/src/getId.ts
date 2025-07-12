/**
 * Generates a random string of a given length.
 *
 * @param length - The length of the random string.
 * @returns The random string.
 */
export function getId(length = 6): string {
  let str = '';
  for (let l = 36; str.length < length; )
    str += ((Math.random() * l) | 0).toString(l);
  return str;
}
