/**
 * Sets `cause` the way the ES2022 `ErrorOptions` argument does (an own,
 * non-enumerable property), so a cause survives in a browser that drops that
 * argument.
 */
export function setCause(error: Error, cause: unknown): void {
  Object.defineProperty(error, 'cause', {
    value: cause,
    writable: true,
    configurable: true,
  });
}
