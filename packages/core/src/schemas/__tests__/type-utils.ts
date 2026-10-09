/** Compile-time helpers for `.test-d.ts` files. */
export type { IsExactly } from '../../types/util';

/** Requires `true`; with `IsExactly` it fails the build on drift. */
export type Expect<T extends true> = T;
