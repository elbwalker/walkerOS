import type { WalkerOS } from './types';
import {
  isArguments,
  isArray,
  isBoolean,
  isDefined,
  isNumber,
  isObject,
  isString,
} from './is';

/**
 * Checks if a value is a valid property type.
 *
 * @param value The value to check.
 * @returns True if the value is a valid property type, false otherwise.
 */
export function isPropertyType(value: unknown): value is WalkerOS.PropertyType {
  return (
    isBoolean(value) ||
    isString(value) ||
    isNumber(value) ||
    value === null ||
    !isDefined(value) ||
    (isArray(value) && value.every(isPropertyType)) ||
    (isObject(value) && Object.values(value).every(isPropertyType))
  );
}

/**
 * The mapping's rule: a property type that neither is nor contains `null`.
 * A `null` counts as no value there, so a fallback applies.
 */
function isMappableValue(value: unknown): value is WalkerOS.PropertyType {
  return (
    isBoolean(value) ||
    isString(value) ||
    isNumber(value) ||
    !isDefined(value) ||
    (isArray(value) && value.every(isMappableValue)) ||
    (isObject(value) && Object.values(value).every(isMappableValue))
  );
}

/**
 * Filters a value to only include valid property types. Strings, booleans,
 * numbers and `null` are kept, plain objects, arrays and `arguments` copied,
 * a `Date` becomes its timestamp (an invalid one is dropped). Everything else
 * is dropped: functions, `undefined`, symbols, host objects, a `__proto__`
 * key and a key whose getter throws. Never throws.
 *
 * A value JSON can serialize (no cycle) keeps the data JSON gives, shared
 * references included. In a value with a cycle, the back-reference is
 * dropped. Before that first cycle, an object reached again keeps its
 * finished copy; once a cycle has been seen, every later repeated reference
 * in the same call is dropped, so the output stays linear from there on
 * (React fibers).
 *
 * @param value The value to filter.
 * @returns The filtered value or undefined.
 */
export function filterValues(value: unknown): WalkerOS.Property | undefined {
  try {
    return walkValue(value, { seen: new Map(), cyclic: false });
  } catch {
    return undefined;
  }
}

/** Marks an object whose walk has not finished yet. */
const WALKING = Symbol('walking');

type Copy = WalkerOS.PropertyType[] | { [key: string]: WalkerOS.Property };

/** The state of one `filterValues` call. Each object is walked once. */
interface Walk {
  /** Every object met so far: `WALKING` while its walk runs, then its copy. */
  seen: Map<object, Copy | typeof WALKING>;
  /** A cycle was found: an object reached again is dropped from then on. */
  cyclic: boolean;
}

/**
 * One value of `filterValues`. An object still being walked is a cycle and
 * dropped. One walked already returns its copy until the first cycle, so an
 * object shared by two keys is kept twice, as JSON keeps it.
 */
function walkValue(value: unknown, walk: Walk): WalkerOS.Property | undefined {
  if (isString(value) || isBoolean(value) || isNumber(value) || value === null)
    return value;
  if (typeof value !== 'object') return undefined;
  const seen = walk.seen.get(value);
  if (seen === WALKING) {
    walk.cyclic = true;
    return undefined;
  }
  if (seen !== undefined) return walk.cyclic ? undefined : seen;
  if (isArray<unknown>(value)) return walkList(value, walk);
  if (isObject(value)) return walkRecord(value, walk);
  if (isArguments(value)) return walkList(value, walk);
  if (Object.prototype.toString.call(value) === '[object Date]') {
    const time = Date.prototype.getTime.call(value);
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
}

function walkList(
  list: ArrayLike<unknown>,
  walk: Walk,
): WalkerOS.PropertyType[] {
  const length = list.length;
  const out: WalkerOS.PropertyType[] = [];
  walk.seen.set(list, WALKING);
  for (let i = 0; i < length; i++) {
    let item: WalkerOS.Property | undefined;
    try {
      item = walkValue(list[i], walk);
    } catch {
      item = undefined; // A throwing getter drops the item.
    }
    if (isListItem(item)) out.push(item);
  }
  walk.seen.set(list, out);
  return out;
}

function walkRecord(
  record: WalkerOS.AnyObject,
  walk: Walk,
): { [key: string]: WalkerOS.Property } {
  const keys = Object.keys(record);
  const out: { [key: string]: WalkerOS.Property } = {};
  walk.seen.set(record, WALKING);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === '__proto__') continue;
    let item: WalkerOS.Property | undefined;
    try {
      item = walkValue(record[key], walk);
    } catch {
      item = undefined; // A throwing getter drops the key.
    }
    if (item !== undefined) out[key] = item;
  }
  walk.seen.set(record, out);
  return out;
}

// Property has no type for a list in a list; JSON has, and filterValues keeps it.
function isListItem(
  item: WalkerOS.Property | undefined,
): item is WalkerOS.PropertyType {
  return item !== undefined;
}

/**
 * Casts a value to a valid property type for the mapping. A value that is or
 * contains `null` casts to undefined, so a mapping fallback applies.
 *
 * @param value The value to cast.
 * @returns The casted value or undefined.
 */
export function castToProperty(value: unknown): WalkerOS.Property | undefined {
  return isMappableValue(value) ? value : undefined;
}
