import type { Logger } from '@walkeros/core';

/** Warned keys are capped, so unbounded event names cannot grow memory. */
export const SKIP_KEY_CAP = 1000;

const warned = new Set<string>();

/** One warn per key, debug afterwards; every key beyond the cap logs at debug. */
export function logSkip(
  logger: Logger.Instance,
  key: string,
  message: string,
  meta: Record<string, unknown>,
): void {
  if (warned.has(key) || warned.size >= SKIP_KEY_CAP) {
    logger.debug(message, meta);
    return;
  }

  warned.add(key);
  logger.warn(message, meta);
}
