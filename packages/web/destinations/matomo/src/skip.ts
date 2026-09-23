import type { Logger } from '@walkeros/core';

/** Most distinct skip keys that get a warning; beyond it every skip logs at debug. */
export const SKIP_KEY_CAP = 1000;

// Module-level and bounded, so unbounded event names cannot grow memory.
const warned = new Set<string>();

/** Warns once per key, then logs the same skip at debug. */
export function logSkip(
  logger: Logger.Instance,
  key: string,
  message: string,
  meta: Record<string, unknown>,
): void {
  if (!warned.has(key) && warned.size < SKIP_KEY_CAP) {
    warned.add(key);
    logger.warn(message, meta);
    return;
  }

  logger.debug(message, meta);
}
