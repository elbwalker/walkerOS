/**
 * Globals the collector must never replace: the page's own and walkerOS's.
 */
export const RESERVED_WINDOW_GLOBALS: readonly string[] = [
  'elb',
  'elbLayer',
  'window',
  'document',
  'location',
  'self',
  'top',
  'parent',
  'frames',
  'globalThis',
  '__proto__',
  'constructor',
  'prototype',
];

/** A JavaScript identifier: safe to interpolate as a `window` property name. */
const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export type WindowCollectorCheck =
  | { ok: true; name: string }
  | { ok: false; reason: string };

/**
 * Check a resolved `config.settings.windowCollector` value: the global a web
 * bundle assigns the collector to. It must be a JavaScript identifier (it is
 * interpolated into generated code) and must not replace a reserved global.
 * The `reason` completes a sentence about the value ("is not ...").
 */
export function checkWindowCollector(value: unknown): WindowCollectorCheck {
  if (typeof value !== 'string')
    return { ok: false, reason: 'is not a string' };
  if (!IDENTIFIER_PATTERN.test(value))
    return {
      ok: false,
      reason:
        'is not a JavaScript identifier (letters, digits, _ or $, not starting with a digit)',
    };
  if (RESERVED_WINDOW_GLOBALS.includes(value))
    return {
      ok: false,
      reason: `is reserved (${RESERVED_WINDOW_GLOBALS.join(', ')})`,
    };
  return { ok: true, name: value };
}
