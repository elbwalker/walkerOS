import { checkWindowCollector } from '@walkeros/core';

/** Where a collector global name came from, for the error message. */
export interface WindowCollectorSource {
  /** Setting path, e.g. `flows.web.config.settings.windowCollector`. */
  path?: string;
  /** The value as written, when it was a `$var` / `$env` reference. */
  written?: unknown;
}

/**
 * Return `value` as the collector global name, or throw when it is not a
 * JavaScript identifier or names a reserved global. The name is interpolated
 * into generated code, so every build path checks it before use.
 */
export function assertWindowCollector(
  value: unknown,
  source: WindowCollectorSource = {},
): string {
  const check = checkWindowCollector(value);
  if (check.ok) return check.name;
  const path = source.path ?? 'config.settings.windowCollector';
  const subject =
    source.written !== undefined && source.written !== value
      ? `${JSON.stringify(source.written)} resolved to ${JSON.stringify(value)}, which`
      : JSON.stringify(value);
  throw new Error(`${path}: ${subject} ${check.reason}.`);
}
