/**
 * Start Command Validators
 *
 * Validation logic for start command inputs.
 */

/**
 * Validates a port number: an integer between 1 and 65535.
 *
 * A plain range check on purpose: the runtime keeps zod and the schema barrel
 * of the zod-backed core dev entry out of its import graph.
 *
 * @param port - Port number to validate
 * @throws Error if port is invalid
 */
export function validatePort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port: ${port}\n` +
        `   Port must be an integer between 1 and 65535\n` +
        `   Example: --port 8080`,
    );
  }
}
