/**
 * Utility functions for the CLI package
 */

/**
 * Extract error message from unknown error type
 * @param error - Unknown error object
 * @returns Error message as string
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
