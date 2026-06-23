import type { WalkerOS } from '@walkeros/core';
import type { ConsentMapping, Settings } from '../types';

// walkerOS consent groups -> gtag consent parameters
export const DEFAULT_CONSENT_MAPPING: ConsentMapping = {
  marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  functional: ['analytics_storage'],
};

const DEFAULT_WAIT_FOR_UPDATE = 500;

/** Resolve the active mapping, or undefined when consent mode is disabled. */
export function resolveConsentMapping(
  settings: Partial<Settings>,
): ConsentMapping | undefined {
  const { como = true } = settings;
  if (como === false) return undefined;
  return como === true ? DEFAULT_CONSENT_MAPPING : como;
}

/** Flatten a mapping to the unique set of gtag parameter names. */
export function collectGtagParams(mapping: ConsentMapping): string[] {
  const params = new Set<string>();
  Object.values(mapping).forEach((value) => {
    (Array.isArray(value) ? value : [value]).forEach((p) => params.add(p));
  });
  return [...params];
}

/**
 * Build the `consent default` object (all params denied), or undefined when
 * consent mode is disabled or the mapping yields no params. Adds
 * `wait_for_update` when `como_advanced` is truthy.
 */
export function buildDefaultConsent(
  settings: Partial<Settings>,
): Record<string, 'denied' | number> | undefined {
  const mapping = resolveConsentMapping(settings);
  if (!mapping) return undefined;

  const params = collectGtagParams(mapping);
  if (!params.length) return undefined;

  const result: Record<string, 'denied' | number> = {};
  params.forEach((p) => (result[p] = 'denied'));

  const { como_advanced } = settings;
  if (como_advanced)
    result.wait_for_update =
      typeof como_advanced === 'number'
        ? como_advanced
        : DEFAULT_WAIT_FOR_UPDATE;

  return result;
}

/**
 * Is consent genuinely in play, decided from the destination's OWN config only?
 * config.consent set (basic/gated) or como_advanced truthy (advanced). Never
 * reads collector state, and never config.require (consumed by the collector
 * before init runs).
 */
export function hasConsentSignal(
  configConsent: WalkerOS.Consent | undefined,
  settings: Partial<Settings>,
): boolean {
  if (configConsent && Object.keys(configConsent).length > 0) return true;
  return !!settings.como_advanced;
}
