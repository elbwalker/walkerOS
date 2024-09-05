export function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}
