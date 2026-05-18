import { stepId } from '..';

describe('stepId', () => {
  test('collector kind returns the literal "collector"', () => {
    expect(stepId('collector')).toBe('collector');
  });

  test('destination kind formats as "destination.<id>"', () => {
    expect(stepId('destination', 'ga4')).toBe('destination.ga4');
  });

  test('source kind formats as "source.<id>"', () => {
    expect(stepId('source', 'web')).toBe('source.web');
  });

  test('transformer kind formats as "transformer.<id>"', () => {
    expect(stepId('transformer', 'pii')).toBe('transformer.pii');
  });

  test('throws when a non-collector kind is called with an empty id', () => {
    expect(() => stepId('destination', '')).toThrow(
      'stepId(destination) requires an id',
    );
  });

  // Compile-time guard: `stepId('destination')` (no id) is rejected by the
  // overload signatures. Documented here, not enforced at runtime — the
  // typed overloads prevent it from ever reaching this code path in
  // production callers.
});
