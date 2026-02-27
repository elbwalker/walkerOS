/**
 * Compare simulation output against expected example output.
 */
export function compareOutput(
  expected: unknown,
  actual: unknown,
): { expected: unknown; actual: unknown; match: boolean; diff?: string } {
  const expectedStr = JSON.stringify(expected, null, 2);
  const actualStr = JSON.stringify(actual, null, 2);

  if (expectedStr === actualStr) {
    return { expected, actual, match: true };
  }

  return {
    expected,
    actual,
    match: false,
    diff: `Expected:\n${expectedStr}\n\nActual:\n${actualStr}`,
  };
}
