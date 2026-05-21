import { mergeMappingRule } from '../mergeMapping';
import type { Mapping } from '../types';

describe('mergeMappingRule', () => {
  const base: Mapping.Rule = {
    name: 'order complete',
    data: {
      map: {
        id: 'params.ep.transaction_id',
        currency: 'params.ep.currency',
        total: 'params.epn.value',
      },
    },
    consent: { marketing: true },
  };
  it('replaces when neither extend nor remove is present', () => {
    expect(mergeMappingRule(base, { name: 'purchase' })).toEqual({
      name: 'purchase',
    });
  });
  it('adds a new data.map field, inheriting the rest', () => {
    const result = mergeMappingRule(base, {
      extend: { data: { map: { coupon: 'params.ep.coupon' } } },
    });
    expect(result.data).toEqual({
      map: {
        id: 'params.ep.transaction_id',
        currency: 'params.ep.currency',
        total: 'params.epn.value',
        coupon: 'params.ep.coupon',
      },
    });
    expect(result.name).toBe('order complete');
  });
  it('overrides a single data.map field, leaving siblings intact', () => {
    const result = mergeMappingRule(base, {
      extend: { data: { map: { id: 'params.ep.order_id' } } },
    });
    expect(result.data).toEqual({
      map: {
        id: 'params.ep.order_id',
        currency: 'params.ep.currency',
        total: 'params.epn.value',
      },
    });
  });
  it('overrides the event name while inheriting data', () => {
    const result = mergeMappingRule(base, { extend: { name: 'purchase' } });
    expect(result.name).toBe('purchase');
    expect(result.data).toEqual(base.data);
  });
  it('clears an inherited field when extend sets it to null', () => {
    const result = mergeMappingRule(base, { extend: { consent: null } });
    expect('consent' in result).toBe(false);
  });
  it('carries remove onto the merged rule', () => {
    const result = mergeMappingRule(base, { remove: ['currency'] });
    expect(result.remove).toEqual(['currency']);
    expect(result.data).toEqual(base.data);
  });
  it('combines extend and remove', () => {
    const result = mergeMappingRule(base, {
      extend: { data: { map: { coupon: 'params.ep.coupon' } } },
      remove: ['currency'],
    });
    expect(result.data).toEqual({
      map: {
        id: 'params.ep.transaction_id',
        currency: 'params.ep.currency',
        total: 'params.epn.value',
        coupon: 'params.ep.coupon',
      },
    });
    expect(result.remove).toEqual(['currency']);
  });
  it('does not mutate base or override', () => {
    mergeMappingRule(base, { extend: { data: { map: { coupon: 'x' } } } });
    expect(base.data).toEqual({
      map: {
        id: 'params.ep.transaction_id',
        currency: 'params.ep.currency',
        total: 'params.epn.value',
      },
    });
  });
});
