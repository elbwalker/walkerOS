/**
 * Shared parser for `<kind>.<name>` component references used by both the
 * `push --simulate` and `setup` commands.
 *
 * Both commands accept a target string identifying a component in a flow,
 * with overlapping but not identical syntax. This helper handles the common
 * prefix-and-name parsing in one place. Callers that need additional segments
 * (e.g. push's chain notation `destination.NAME.before.TRANSFORMER`) layer
 * their own logic on top of `rest`.
 */

/**
 * Result of parsing a `<prefix>.<name>...` string. `prefix` is validated to be
 * one of the caller-provided allowed values, `name` is the second segment, and
 * `rest` contains any remaining dot-separated segments past `name` for callers
 * that consume them.
 */
export interface ParsedComponentRef<TPrefix extends string> {
  prefix: TPrefix;
  name: string;
  rest: string[];
}

export interface ParseComponentRefMessages {
  /**
   * Returned when the input has fewer than two dot-separated parts.
   * Receives the raw input string.
   */
  invalidFormat?: (input: string) => string;
  /**
   * Returned when the prefix does not match any allowed value.
   * Receives the parsed prefix.
   */
  invalidPrefix?: (prefix: string) => string;
  /**
   * Returned when the name segment after the prefix is empty.
   * Receives the raw input and the parsed prefix.
   */
  missingName?: (input: string, prefix: string) => string;
}

export interface ParseComponentRefOptions<TPrefix extends string> {
  /** Allowed prefix values; the parser validates against this list. */
  allowed: readonly TPrefix[];
  /**
   * Optional per-error message overrides so callers can preserve their
   * existing error wording (e.g. `parseStep` uses "step format", whereas
   * `resolveComponent` uses "target").
   */
  messages?: ParseComponentRefMessages;
}

function isAllowedPrefix<TPrefix extends string>(
  value: string,
  allowed: readonly TPrefix[],
): value is TPrefix {
  return (allowed as readonly string[]).includes(value);
}

/**
 * Parse a `<prefix>.<name>[.<rest>...]` string with strict prefix validation.
 *
 * Throws on:
 * - missing dot or fewer than two segments
 * - empty name (trailing dot or `prefix.`)
 * - prefix not in `allowed`
 */
export function parseComponentRef<TPrefix extends string>(
  input: string,
  options: ParseComponentRefOptions<TPrefix>,
): ParsedComponentRef<TPrefix> {
  const { allowed, messages = {} } = options;
  const allowedList = allowed.join(' | ');

  const parts = input.split('.');
  if (parts.length < 2) {
    const msg = messages.invalidFormat
      ? messages.invalidFormat(input)
      : `Invalid target "${input}". Expected <kind>.<name> where kind is ${allowedList}.`;
    throw new Error(msg);
  }

  const prefix = parts[0];
  const name = parts[1];

  if (!name) {
    const msg = messages.missingName
      ? messages.missingName(input, prefix)
      : `Invalid target "${input}". Missing name after "${prefix}."`;
    throw new Error(msg);
  }

  if (!isAllowedPrefix(prefix, allowed)) {
    const msg = messages.invalidPrefix
      ? messages.invalidPrefix(prefix)
      : `Invalid kind "${prefix}". Expected ${allowedList}.`;
    throw new Error(msg);
  }

  return {
    prefix,
    name,
    rest: parts.slice(2),
  };
}
