/** `x` limited to [0, 1]. */
export function clamp(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Cubic ease in and out on [0, 1]. */
export function ease(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
