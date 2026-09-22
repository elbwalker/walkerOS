import type { Collector, WalkerOS } from '@walkeros/core';
import type { Settings } from './types';
import { getGrantedConsent } from '@walkeros/core';

/**
 * Whether a hit is identified. Absent or true: always. False: never. A consent
 * object: when that consent is granted by the collector state or the event.
 * Without an event (at init) only the collector state counts.
 */
export function isIdentified(
  setting: Settings['identified'],
  collector: Collector.Instance,
  event?: WalkerOS.Event,
): boolean {
  if (setting === undefined || setting === true) return true;
  if (setting === false) return false;
  return (
    getGrantedConsent(setting, collector.consent, event?.consent) !== false
  );
}

// The tracker's identified state per key (the destination keys by its
// collector); absent means identified, the tracker default.
const states = new WeakMap<object, boolean>();

/**
 * Commands to push before a hit so the tracker's state matches `identified`;
 * updates the state recorded for `key`. Anonymous runs without tracker
 * cookies: they are disabled, existing ones deleted (a returning visitor who
 * revoked consent loses them too), and enabled again on identification.
 */
export function transition(key: object, identified: boolean): unknown[][] {
  const current = states.get(key) ?? true;
  states.set(key, identified);

  if (current === identified) return [];
  return identified
    ? [['enableCookies'], ['deanonymizeUser']]
    : [['disableCookies'], ['deleteCookies'], ['setUserIsAnonymous', true]];
}
