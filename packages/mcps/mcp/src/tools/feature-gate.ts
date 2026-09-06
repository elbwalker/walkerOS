import { isAuthError, AUTH_HINT } from '../types.js';

/** The code every door answers a plan or project gate with. */
export const FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE';

/** The features a door can refuse a whole tool for. */
export type GatedFeature = 'hub' | 'frames';

function codeOf(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('code' in error)) return undefined;
  const code = error.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * A denial is recognised by its code, never by its wording: the two doors phrase
 * the refusal differently and only the code is contractual.
 */
export function isFeatureDenial(error: unknown): boolean {
  return codeOf(error) === FEATURE_NOT_AVAILABLE;
}

/**
 * Names the feature so an agent can tell the person what is missing. Enabling
 * it is a plan or project entitlement change made in the app, never something
 * a tool can do, and the hint says so instead of inviting a retry.
 */
export function featureDenialHint(feature: GatedFeature): string {
  return `The "${feature}" feature is not enabled for this project. Tell the person that "${feature}" needs a plan or project entitlement that unlocks it, which is changed in the app, not through this tool.`;
}

/**
 * One hint rule for the gated tools: a feature denial names the feature, an
 * auth failure points at the auth tool, a NOT_FOUND points at discovery, and
 * anything else carries no hint.
 *
 * Order matters, though not because of the HTTP status: `isAuthError` reads the
 * error's code and the words in its message, never a status. A denial carries
 * its own code, but its MESSAGE is a door's free choice, and one worded
 * "Forbidden" is a message `isAuthError` answers to. Reading the specific
 * reason first is what keeps such a denial from being reported as a login
 * problem the person could fix by logging in again.
 */
export function errorHint(
  error: unknown,
  feature: GatedFeature,
  notFoundHint: string,
): string | undefined {
  if (isFeatureDenial(error)) return featureDenialHint(feature);
  if (isAuthError(error)) return AUTH_HINT;
  if (codeOf(error) === 'NOT_FOUND') return notFoundHint;
  return undefined;
}
