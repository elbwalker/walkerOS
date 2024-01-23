export function getByStringDot(
  event: unknown,
  key: string,
  i: unknown = 0,
): unknown {
  // String dot notation for object ("data.id" -> { data: { id: 1 } })
  const value = key.split('.').reduce((obj, key) => {
    // Update the wildcard to the given index
    if (key == '*') key = String(i);

    if (obj instanceof Object) return obj[key as keyof typeof obj];

    return;
  }, event);

  return value;
}
