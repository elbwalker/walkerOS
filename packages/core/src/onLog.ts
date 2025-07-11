/**
 * Logs a message to the console if verbose logging is enabled.
 *
 * @param message The message to log.
 * @param verbose Whether to log the message.
 */
export function onLog(message: unknown, verbose = false): void {
  // eslint-disable-next-line no-console
  if (verbose) console.dir(message, { depth: 4 });
}
