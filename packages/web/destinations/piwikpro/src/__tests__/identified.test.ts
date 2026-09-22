import type { WalkerOS } from '@walkeros/core';
import type { Settings } from '../types';
import { startFlow } from '@walkeros/collector';
import { getEvent } from '@walkeros/core';
import { isIdentified, transition } from '../identified';

describe('identified', () => {
  const granted: WalkerOS.Consent = { marketing: true };
  const denied: WalkerOS.Consent = { functional: true };

  test.each<[string, Settings['identified'], WalkerOS.Consent, boolean]>([
    ['absent', undefined, denied, true],
    ['true', true, denied, true],
    ['false', false, granted, false],
    ['a consent object, granted', { marketing: true }, granted, true],
    ['a consent object, not granted', { marketing: true }, denied, false],
  ])('isIdentified with %s', async (_name, setting, consent, expected) => {
    const { collector } = await startFlow();

    expect(
      isIdentified(setting, collector, getEvent('page view', { consent })),
    ).toBe(expected);
  });

  test('isIdentified reads the collector consent state too', async () => {
    const { collector, elb } = await startFlow();
    await elb('walker consent', { marketing: true });

    expect(
      isIdentified(
        { marketing: true },
        collector,
        getEvent('page view', { consent: denied }),
      ),
    ).toBe(true);
  });

  test('transition pushes only state changes, per key', () => {
    const queue = {};

    expect(transition(queue, false)).toEqual([
      ['disableCookies'],
      ['deleteCookies'],
      ['setUserIsAnonymous', true],
    ]);
    expect(transition(queue, false)).toEqual([]);
    expect(transition(queue, true)).toEqual([
      ['enableCookies'],
      ['deanonymizeUser'],
    ]);
    expect(transition(queue, true)).toEqual([]);
    expect(transition({}, true)).toEqual([]);
  });
});
