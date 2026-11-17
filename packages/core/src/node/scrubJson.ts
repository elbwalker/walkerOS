import {
  asCompiled,
  MIN_KNOWN_LEN,
  scrubSecrets,
  type CompiledKnown,
  type ScrubOptions,
} from '../redactLine';
import { toPrintable } from './toPrintable';

// A number printed from parsed JSON holds only these characters, so a known
// form with any other character can never be part of one.
const RE_NUMBER_SHAPED = /^[0-9.eE+-]+$/;
const numberFormsOf = new WeakMap<CompiledKnown, readonly string[]>();

/**
 * The forms of a compiled set that a printed number can contain. Held per
 * set, so a logger that masks many lines with one set filters it once.
 */
export function knownNumberForms(known: CompiledKnown): readonly string[] {
  let forms = numberFormsOf.get(known);
  if (!forms) {
    forms = known.forms.filter((form) => RE_NUMBER_SHAPED.test(form));
    numberFormsOf.set(known, forms);
  }
  return forms;
}

/**
 * A deep copy of `value` in which every number whose printed form contains a
 * known secret (6+ characters, e.g. `12345678`, `-1234567`, `1234567.5`)
 * becomes `'***'`. Masking such a number inside serialized JSON would leave an
 * unquoted `***` and break the JSON, so it runs on the value before
 * `JSON.stringify`. With no candidate, `value` comes back as it is. Exported
 * for its unit test and the logger handler; egress goes through `scrubJson`,
 * which owns the order.
 */
export function maskKnownNumbers(
  value: unknown,
  known: readonly string[] | CompiledKnown,
): unknown {
  const candidates =
    'forms' in known
      ? knownNumberForms(known)
      : known.filter((secret) => secret.length >= MIN_KNOWN_LEN);
  if (candidates.length === 0) return value;
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
  const known = asCompiled(options.known);
  const text =
    JSON.stringify(
      maskKnownNumbers(toPrintable(value), known),
      null,
      options.space,
    ) ?? 'undefined';
  return scrubSecrets(text, { known });
}
