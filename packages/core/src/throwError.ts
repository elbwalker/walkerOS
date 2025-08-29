/**
 * Throws an error.
 *
 * @param error The error to throw.
 */
export function throwError(error: unknown): never {
  throw new Error(String(error));
}
