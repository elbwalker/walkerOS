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
