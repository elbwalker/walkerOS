import type { Source, WalkerOS } from '@walkeros/core';
import { normalizeBeforeConditions } from '../before';

describe('normalizeBeforeConditions', () => {
  test('string condition normalizes to PendingCondition with undefined test', () => {
    const conditions: Source.BeforeCondition[] = ['consent'];
    const result = normalizeBeforeConditions(conditions);
    expect(result).toEqual([{ type: 'consent', test: undefined }]);
  });

  test('multiple string conditions', () => {
    const conditions: Source.BeforeCondition[] = ['consent', 'user'];
    const result = normalizeBeforeConditions(conditions);
    expect(result).toEqual([
      { type: 'consent', test: undefined },
      { type: 'user', test: undefined },
    ]);
  });

  test('object condition normalizes with test function', () => {
    const testFn = (data: WalkerOS.Consent) => !!data.marketing;
    const conditions: Source.BeforeCondition[] = [{ consent: testFn }];
    const result = normalizeBeforeConditions(conditions);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('consent');
    expect(result[0].test).toBeDefined();
    expect(result[0].test!({ marketing: true })).toBe(true);
    expect(result[0].test!({ marketing: false })).toBe(false);
  });

  test('mixed string and object conditions', () => {
    const conditions: Source.BeforeCondition[] = [
      'run',
      { consent: (data: WalkerOS.Consent) => !!data.marketing },
    ];
    const result = normalizeBeforeConditions(conditions);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'run', test: undefined });
    expect(result[1].type).toBe('consent');
    expect(result[1].test).toBeDefined();
  });

  test('undefined returns empty array', () => {
    expect(normalizeBeforeConditions(undefined)).toEqual([]);
  });

  test('empty array returns empty array', () => {
    expect(normalizeBeforeConditions([])).toEqual([]);
  });
});
