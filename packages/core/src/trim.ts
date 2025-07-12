/**
 * Trims quotes and whitespaces from a string.
 *
 * @param str The string to trim.
 * @returns The trimmed string.
 */
export function trim(str: string): string {
  // Remove quotes and whitespaces
  return str ? str.trim().replace(/^'|'$/g, '').trim() : '';
}
