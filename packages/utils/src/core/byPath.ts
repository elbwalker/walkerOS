export function getByPath(
  event: unknown,
  key: string = '',
  defaultValue?: unknown,
  i: unknown = 0,
): unknown {
  // String dot notation for object ("data.id" -> { data: { id: 1 } })
  const keys = key.split('.');
  let values: unknown = event;

  for (let index = 0; index < keys.length; index++) {
    const k = keys[index];

    if (k === '*' && Array.isArray(values)) {
      const remainingKeys = keys.slice(index + 1).join('.');
      const result: unknown[] = [];

      for (const item of values) {
        const value = getByPath(item, remainingKeys, defaultValue, i);
        result.push(value);
      }

      return result;
    }

    values =
      values instanceof Object ? values[k as keyof typeof values] : undefined;

    if (!values) break;
  }

  return values || defaultValue;
}
