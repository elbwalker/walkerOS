export function isSameType<T>(
  variable: unknown,
  type: T,
): variable is typeof type {
  return typeof variable === typeof type;
}
