import type { Mapping, WalkerOS } from '../types';
import {
  checkConsent,
  getGrantedConsent,
  getRequiredConsent,
} from '../consent';

describe('getRequiredConsent', () => {
  const step = { consent: { analytics: true } };
  const rule: Mapping.Rule = { consent: { marketing: true } };
  it.each<
    [
      string,
      { consent?: WalkerOS.Consent },
      Mapping.Rule | undefined,
      WalkerOS.Consent[],
    ]
  >([
    ['step only', step, undefined, [{ analytics: true }]],
    [
      'step and rule, in that order',
      step,
      rule,
      [{ analytics: true }, { marketing: true }],
    ],
    ['rule only', {}, rule, [{ marketing: true }]],
    ['empty objects dropped', { consent: {} }, { consent: {} }, []],
    [
      'ignore rule dropped',
      step,
      { ignore: true, consent: { marketing: true } },
      [{ analytics: true }],
    ],
  ])('%s', (_label, config, matched, expected) => {
    expect(getRequiredConsent(config, matched)).toEqual(expected);
  });
});

describe('checkConsent', () => {
  it.each<
    [string, WalkerOS.Consent[], WalkerOS.Consent, WalkerOS.Consent | undefined]
  >([
    ['empty list passes', [], {}, undefined],
    [
      'both hold',
      [{ analytics: true }, { marketing: true }],
      { analytics: true, marketing: true },
      undefined,
    ],
    [
      'rule unmet',
      [{ analytics: true }, { marketing: true }],
      { analytics: true },
      { marketing: true },
    ],
    [
      'first unmet wins',
      [{ analytics: true }, { marketing: true }],
      {},
      { analytics: true },
    ],
    [
      'OR within one entry',
      [{ marketing: true, ads: true }],
      { ads: true },
      undefined,
    ],
  ])('%s', (_label, required, state, unmet) => {
    const check = checkConsent(required, state);
    expect('unmet' in check ? check.unmet : undefined).toEqual(unmet);
  });
  it('returns the granted states, individual over state', () => {
    expect(
      checkConsent([{ a: true }], { a: true, b: true }, { b: false }),
    ).toEqual({ granted: { a: true } });
  });
  it('leaves getGrantedConsent unchanged', () => {
    expect(getGrantedConsent({ a: true }, { a: true, b: true })).toEqual({
      a: true,
      b: true,
    });
    expect(getGrantedConsent({ a: true }, { b: true })).toBe(false);
    expect(getGrantedConsent({}, { b: true })).toEqual({ b: true });
  });
});
