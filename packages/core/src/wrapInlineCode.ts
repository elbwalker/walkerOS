/**
 * Inline Code Wrapping Utilities
 *
 * Converts inline code strings to executable functions for the three mapping
 * callbacks: condition, fn, validate. All three share a single signature:
 *
 *   (value, context) => result
 *
 * Inside the inline body, the available bindings are:
 *   - value:    unknown - the value being mapped/validated/checked
 *   - context:  Mapping.Context with these fields:
 *       event:     WalkerOS.DeepPartialEvent
 *       mapping:   Mapping.Value | Mapping.Rule
 *       collector: Collector.Instance
 *       logger:    Logger.Instance
 *       consent?:  WalkerOS.Consent
 *
 * If the body has no explicit `return`, it is auto-wrapped with `return`.
 *
 * @packageDocumentation
 */

import type { Mapping } from './types';

function hasReturn(code: string): boolean {
  return /\breturn\b/.test(code);
}

function wrapCode(code: string): string {
  return hasReturn(code) ? code : `return ${code}`;
}

/**
 * Wrap inline code as a Mapping.Condition.
 *
 * @example
 * ```ts
 * const c = wrapCondition('context.consent?.marketing === true');
 * c(value, context); // boolean
 * ```
 */
export function wrapCondition(code: string): Mapping.Condition {
  const body = wrapCode(code);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('value', 'context', body) as Mapping.Condition;
}

/**
 * Wrap inline code as a Mapping.Fn.
 *
 * @example
 * ```ts
 * const fn = wrapFn('value.user.email.split("@")[1]');
 * fn(value, context); // domain
 * ```
 */
export function wrapFn(code: string): Mapping.Fn {
  const body = wrapCode(code);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('value', 'context', body) as Mapping.Fn;
}

/**
 * Wrap inline code as a Mapping.Validate.
 *
 * @example
 * ```ts
 * const v = wrapValidate('typeof value === "string" && value.length > 0');
 * v(value, context); // boolean
 * ```
 */
export function wrapValidate(code: string): Mapping.Validate {
  const body = wrapCode(code);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('value', 'context', body) as Mapping.Validate;
}
