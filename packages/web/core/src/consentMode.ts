import type { WalkerOS } from '@walkeros/core';

/**
 * walkerOS consent groups mapped to consent mode parameters, as Google
 * Consent Mode and the tools compatible with it (d8a) name them.
 */
export interface ConsentMapping {
  [walkerOSConsentGroup: string]: string | string[];
}

export type ConsentModeValue = 'granted' | 'denied';

/**
 * Default mapping: measurement storage follows `analytics`, the ad
 * parameters follow `marketing`.
 */
export const DEFAULT_CONSENT_MODE_MAPPING: ConsentMapping = {
  marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  analytics: ['analytics_storage'],
};

function parametersOf(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

/** Every parameter a mapping names, once, in mapping order. */
export function consentModeParameters(mapping: ConsentMapping): string[] {
  const parameters = new Set<string>();
  Object.values(mapping).forEach((value) =>
    parametersOf(value).forEach((parameter) => parameters.add(parameter)),
  );
  return [...parameters];
}

/**
 * Resolve consent mode parameters from walkerOS consent.
 *
 * A parameter is granted only when every group that maps to it is granted in
 * `state`, the whole consent state; a group missing from it counts as denied.
 * With `changed`, the result holds only the parameters of those groups, as a
 * consent update carries only what a consent command changed. Groups the
 * mapping does not name resolve nothing.
 */
export function resolveConsentMode(
  mapping: ConsentMapping,
  state: WalkerOS.Consent,
  changed?: WalkerOS.Consent,
): Record<string, ConsentModeValue> {
  const groupsOf = new Map<string, string[]>();
  Object.entries(mapping).forEach(([group, value]) =>
    parametersOf(value).forEach((parameter) => {
      groupsOf.set(parameter, [...(groupsOf.get(parameter) ?? []), group]);
    }),
  );

  const wanted = changed
    ? new Set(
        Object.keys(changed).flatMap((group) =>
          Object.prototype.hasOwnProperty.call(mapping, group)
            ? parametersOf(mapping[group])
            : [],
        ),
      )
    : new Set(groupsOf.keys());

  const result: Record<string, ConsentModeValue> = {};
  wanted.forEach((parameter) => {
    const groups = groupsOf.get(parameter);
    const granted = !!groups && groups.every((group) => state[group] === true);
    result[parameter] = granted ? 'granted' : 'denied';
  });
  return result;
}
