import type { StepOut, StepEffect } from '../types/flow';

/**
 * Format a step example's `out` as readable code for docs/app rendering.
 *
 * - Empty `out` → `// no output`.
 * - `['return', value]` → `return <value>` (no parentheses).
 * - `[callable, ...args]` → `callable(<args>)`.
 * - Primitive args render as JSON (strings quoted, numbers/booleans/null bare).
 * - `undefined` renders as the literal token `undefined`.
 * - Objects/arrays render as `JSON.stringify(v, null, 2)`.
 * - Functions render as `[Function]` (rare in outs; safe fallback).
 *
 * Pure function. No runtime dependencies. Used by the website
 * `<StepExample>` renderer and the app `OutputPanel` for a single source of truth.
 */
export function formatOut(out: StepOut): string {
  if (out.length === 0) return '// no output';
  return out.map(formatEffect).join(';\n\n');
}

function formatEffect(effect: StepEffect): string {
  const [callable, ...args] = effect;
  const argStr = args.map(formatValue).join(', ');
  if (callable === 'return') return argStr ? `return ${argStr}` : 'return';
  return `${callable}(${argStr})`;
}

function formatValue(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'function') return '[Function]';
  return JSON.stringify(v, null, 2);
}
