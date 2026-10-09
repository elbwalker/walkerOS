import type { CSSProperties } from 'react';

/** A demo's per-frame custom property. */
export type VizVar = `--elb-viz-${string}`;

/**
 * Per-frame values as custom properties on an element's style. Callers write
 * each name as a literal key and the demo's partial declares its default, so
 * the design checker matches every var() to a declaration.
 */
export function vizStyle(
  vars: Partial<Record<VizVar, string | number>>,
): CSSProperties {
  const style: CSSProperties = {};
  return Object.assign(style, vars);
}
