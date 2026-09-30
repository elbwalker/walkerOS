import { REF_SECRET } from '@walkeros/core';
import type { Flow } from '@walkeros/core';

/**
 * The values of every `$secret.NAME` the flow references, read from `env`.
 * Names that are unset or empty there are ignored. Hand the result to
 * `scrubSecrets(line, { known })` or the logger's `knownSecrets` so a secret
 * value is masked whatever its shape.
 */
export function collectKnownSecrets(
  flow: Flow.Json,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const names = new Set<string>();
  collectSecretNames(flow, names);
  const values = new Set<string>();
  for (const name of names) {
    const value = env[name];
    if (value) values.add(value);
  }
  return [...values];
}

function collectSecretNames(value: unknown, names: Set<string>): void {
  if (typeof value === 'string') {
    const match = value.match(REF_SECRET);
    if (match) names.add(match[1]);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSecretNames(item, names);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectSecretNames(item, names);
  }
}

/** Known values shorter than this are never masked (as in `maskKnownValues`). */
const MIN_KNOWN_LEN = 6;

/**
 * A deep copy of `value` in which every number whose printed form contains a
 * known secret (6+ characters, e.g. `12345678`, `-1234567`, `1234567.5`)
 * becomes `'***'`. Masking such a number inside serialized JSON would leave an
 * unquoted `***` and break the JSON, so it runs on the value before
 * `JSON.stringify`; the text scrub still runs on the serialized result.
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
