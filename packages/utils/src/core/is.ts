export function isDefined<T>(val: T | undefined): val is T {
  return typeof val !== 'undefined';
}

export function isSameType<T>(
  variable: unknown,
  type: T,
): variable is typeof type {
  return typeof variable === typeof type;
}
