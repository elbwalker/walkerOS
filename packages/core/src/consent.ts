import type { WalkerOS } from './types';

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
  // Merge state and individual, prioritizing individual states
  const states: WalkerOS.Consent = { ...state, ...individual };

  const grantedStates: WalkerOS.Consent = {};
  let hasRequiredConsent = required === undefined;

  Object.keys(states).forEach((name) => {
    if (states[name]) {
      // consent granted
      grantedStates[name] = true;

      // Check if it's required and granted consent
      if (required && required[name]) hasRequiredConsent = true;
    }
  });

  return hasRequiredConsent ? grantedStates : false;
}
