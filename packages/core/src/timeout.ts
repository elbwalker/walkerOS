/**
 * Default per-destination delivery timeout in ms. Applied when a destination's
 * `config.timeout` is `0` or undefined. A hung delivery is converted into a
 * counted DLQ failure after this window so one slow destination never wedges
 * the collector push.
 */
export const DEFAULT_DESTINATION_TIMEOUT_MS = 10_000;

/**
 * Resolve the effective delivery timeout for a destination. A positive number
 * wins; `0` or undefined falls back to {@link DEFAULT_DESTINATION_TIMEOUT_MS}.
 * The collector races deliveries with it and `loadVendor` measures its vendor
 * deadline with it, so both use one definition.
 */
export function resolveDestinationTimeout(timeout?: number): number {
  return typeof timeout === 'number' && timeout > 0
    ? timeout
    : DEFAULT_DESTINATION_TIMEOUT_MS;
}
