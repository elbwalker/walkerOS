/**
 * Compile-time type helpers for drift tests.
 *
 * Pure type-level; no runtime output. Used in `.test-d.ts` files to assert
 * structural equivalence between pairs of types (e.g. TS Config interfaces
 * vs. their Zod-inferred equivalents).
 */

/**
 * Returns `true` when A and B are mutually assignable, `false` otherwise.
 *
 * The double-fn-indirection trick forces TypeScript to compare the two types
 * strictly; plain `A extends B ? B extends A ? true : false : false` has
 * false positives on conditional/distributive types.
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/**
 * Asserts a compile-time condition by requiring the argument to be `true`.
 * Combine with `Equal<A, B>` to fail the TypeScript build on drift.
 */
export type Expect<T extends true> = T;
