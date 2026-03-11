/**
 * Normalize code for comparison
 *
 * Removes comments, normalizes whitespace, and trims
 * to detect if user actually changed the code logic.
 *
 * @param code - The code string to normalize
 * @returns Normalized code string
 */
export function normalizeCode(code: string): string {
  return (
    code
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Trim
      .trim()
  );
}
