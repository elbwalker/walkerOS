import { MIN_KNOWN_LEN, scrubSecrets, type ScrubOptions } from './redactLine';
import { toPrintable } from './toPrintable';

/**
 * A deep copy of `value` in which every number whose printed form contains a
 * known secret (6+ characters, e.g. `12345678`, `-1234567`, `1234567.5`)
 * becomes `'***'`. Masking such a number inside serialized JSON would leave an
 * unquoted `***` and break the JSON, so it runs on the value before
 * `JSON.stringify`. Exported for its unit test; egress goes through
 * `scrubJson`, which owns the order.
 */
export function maskKnownNumbers(
  value: unknown,
  known: readonly string[],
): unknown {
  const candidates = known.filter((secret) => secret.length >= MIN_KNOWN_LEN);
  const mask = (item: unknown): unknown => {
    if (typeof item === 'number') {
      const printed = String(item);
      return candidates.some((secret) => printed.includes(secret))
        ? '***'
        : item;
    }
    if (Array.isArray(item)) return item.map(mask);
    if (item && typeof item === 'object') {
      const copy: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(item)) copy[key] = mask(entry);
      return copy;
    }
    return item;
  };
  return mask(value);
}

/**
 * Serialize a value for egress with secrets masked: its printable form (see
 * `toPrintable`), numbers that print a known value become `'***'`,
 * `JSON.stringify`, then `scrubSecrets` with the same known values. The order
 * keeps the result valid JSON. A value with no JSON form prints `undefined`.
 */
export function scrubJson(
  value: unknown,
  options: ScrubOptions & { space?: number } = {},
): string {
  const known = options.known ?? [];
  const text =
    JSON.stringify(
      maskKnownNumbers(toPrintable(value), known),
      null,
      options.space,
    ) ?? 'undefined';
  return scrubSecrets(text, { known });
}
