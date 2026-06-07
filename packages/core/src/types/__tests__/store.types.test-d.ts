/**
 * Compile-time guards for the canonical `StoreValue` type.
 *
 * Pure type-level; no runtime output. Checked by `tsc` (the package tsconfig
 * includes `src/**`), not by Jest (whose testMatch is `*.test.ts`). It fails
 * the TypeScript build if `StoreValue` stops accepting its members or starts
 * accepting `undefined` (the reserved miss sentinel must never be a value).
 */
import type { StoreValue } from '../store';
import type { Equal, Expect } from '../../schemas/__tests__/type-utils';

// Positive: every intended member is assignable to StoreValue.
const _str: StoreValue = 'hello';
const _num: StoreValue = 42;
const _bool: StoreValue = true;
const _null: StoreValue = null;
const _bytes: StoreValue = new Uint8Array([1, 2, 3]);
const _arr: StoreValue = [1, 'a', null, [true]];
const _obj: StoreValue = { a: 1, b: { c: new Uint8Array([4]) }, d: [null] };

void _str;
void _num;
void _bool;
void _null;
void _bytes;
void _arr;
void _obj;

// Negative: `undefined` is NOT a member of StoreValue (it is the miss
// sentinel). `undefined extends StoreValue` must be false.
type RejectsUndefined = undefined extends StoreValue ? false : true;
type _rejectsUndefinedCheck = Expect<Equal<RejectsUndefined, true>>;
