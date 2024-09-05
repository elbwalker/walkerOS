export function hasValue<T>(value: T): value is Exclude<T, undefined | null> {
  return value !== undefined && value !== null && value !== '';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}
