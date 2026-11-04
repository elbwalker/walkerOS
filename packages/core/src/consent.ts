import type { Mapping, WalkerOS } from './types';

/**
 * The granted states of a consent state, individual states over the state.
 */
function getGrantedStates(
  state: WalkerOS.Consent = {},
  individual: WalkerOS.Consent = {},
): WalkerOS.Consent {
  // Merge state and individual, prioritizing individual states
  const states: WalkerOS.Consent = { ...state, ...individual };

  const grantedStates: WalkerOS.Consent = {};
  Object.keys(states).forEach((name) => {
    if (states[name]) grantedStates[name] = true; // consent granted
  });

  return grantedStates;
}

/**
 * Checks if the required consent is granted.
 *
 * @param required - The required consent states.
 * @param state - The current consent states.
 * @param individual - Individual consent states to prioritize.
 * @returns The granted consent states or false if not granted.
 */
export function getGrantedConsent(
  required: WalkerOS.Consent | undefined,
  state: WalkerOS.Consent = {},
  individual: WalkerOS.Consent = {},
): false | WalkerOS.Consent {
  const granted = getGrantedStates(state, individual);
  if (!required || Object.keys(required).length === 0) return granted;
  return Object.keys(required).some((name) => required[name] && granted[name])
    ? granted
    : false;
}

/**
 * The consent requirements of a step and its matched rule, in that order.
 * Empty requirements are dropped; an `ignore` rule's consent never counts.
 */
export function getRequiredConsent(
  config: { consent?: WalkerOS.Consent },
  rule?: Mapping.Rule,
): WalkerOS.Consent[] {
  const ruleConsent = rule && !rule.ignore ? rule.consent : undefined;
  return [config.consent, ruleConsent].filter(
    (required): required is WalkerOS.Consent =>
      !!required && Object.keys(required).length > 0,
  );
}

export type ConsentCheck =
  | { granted: WalkerOS.Consent }
  | { unmet: WalkerOS.Consent };

/**
 * Checks a list of consent requirements. Every entry must hold; within one
 * entry, any granted key suffices; an empty list or an empty object passes.
 * `unmet` is the first entry not granted.
 */
export function checkConsent(
  required: WalkerOS.Consent[],
  state?: WalkerOS.Consent,
  individual?: WalkerOS.Consent,
): ConsentCheck {
  const unmet = required.find(
    (entry) => !getGrantedConsent(entry, state, individual),
  );
  return unmet ? { unmet } : { granted: getGrantedStates(state, individual) };
}
