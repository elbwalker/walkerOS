/**
 * Inline Code Wrapping Utilities
 *
 * Converts inline code strings to executable functions.
 * Used for mapping properties: condition, fn, validate.
 *
 * @packageDocumentation
 */

import type { Mapping } from './types';

/**
 * Detect if code has explicit return statement.
 */
function hasReturn(code: string): boolean {
  return /\breturn\b/.test(code);
}

/**
 * Wrap code with function body.
 * If code has no return, auto-wrap with return.
 */
function wrapCode(code: string): string {
  return hasReturn(code) ? code : `return ${code}`;
}

/**
 * Wrap inline code string as Condition function.
 *
 * @param code - Inline code string
 * @returns Condition function matching Mapping.Condition signature
 *
 * @remarks
 * Available parameters in code:
 * - `value` - The event or partial event being processed
 * - `mapping` - Current mapping configuration
 * - `collector` - Collector instance
 *
 * If code has no explicit return, it's auto-wrapped with `return`.
 *
 * @example
 * ```typescript
 * // One-liner (auto-wrapped)
 * const fn = wrapCondition('value.data.total > 100');
 * fn(event, mapping, collector); // returns boolean
 *
 * // Multi-statement (explicit return)
 * const fn = wrapCondition('const threshold = 100; return value.data.total > threshold');
 * ```
 */
export function wrapCondition(code: string): Mapping.Condition {
  const body = wrapCode(code);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(
    'value',
    'mapping',
    'collector',
    body,
  ) as Mapping.Condition;
}

/**
 * Wrap inline code string as Fn function.
 *
 * @param code - Inline code string
 * @returns Fn function matching Mapping.Fn signature
 *
 * @remarks
 * Available parameters in code:
 * - `value` - The event or partial event being processed
 * - `mapping` - Current mapping configuration
 * - `options` - Options object with consent and collector
 *
 * If code has no explicit return, it's auto-wrapped with `return`.
 *
 * @example
 * ```typescript
 * // One-liner (auto-wrapped)
 * const fn = wrapFn('value.user.email.split("@")[1]');
 * fn(event, mapping, options); // returns domain
 *
 * // Multi-statement (explicit return)
 * const fn = wrapFn('const parts = value.user.email.split("@"); return parts[1].toUpperCase()');
 * ```
 */
export function wrapFn(code: string): Mapping.Fn {
  const body = wrapCode(code);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('value', 'mapping', 'options', body) as Mapping.Fn;
}

/**
 * Wrap inline code string as Validate function.
 *
 * @param code - Inline code string
 * @returns Validate function matching Mapping.Validate signature
 *
 * @remarks
 * Available parameters in code:
 * - `value` - The current value being validated
 *
 * If code has no explicit return, it's auto-wrapped with `return`.
 *
 * @example
 * ```typescript
 * // One-liner (auto-wrapped)
 * const fn = wrapValidate('value && value.length > 0');
 * fn('hello'); // returns true
 *
 * // Multi-statement (explicit return)
 * const fn = wrapValidate('if (!value) return false; return value.length > 0');
 * ```
 */
export function wrapValidate(code: string): Mapping.Validate {
  const body = wrapCode(code);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('value', body) as Mapping.Validate;
}
