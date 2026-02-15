import type { Source, WalkerOS } from '@walkeros/core';
import type { Types, Settings, UsercentricsEventDetail } from './types';

// Export types for external usage
export * as SourceUsercentrics from './types';

// Export examples
export * from './examples';

/** Reserved keys in event.detail that are not service names */
const RESERVED_KEYS = ['action', 'event', 'type', 'ucCategory'];

/**
 * Usercentrics consent management source for walkerOS.
 *
 * This source listens to Usercentrics CMP events and translates
 * consent states to walkerOS consent commands.
 *
 * @example
 * ```typescript
 * import { sourceUsercentrics } from '@walkeros/web-source-cmp-usercentrics';
 *
 * const collector = createCollector({
 *   sources: {
 *     consent: {
 *       code: sourceUsercentrics,
 *       config: {
 *         settings: {
 *           eventName: 'ucEvent',
 *           categoryMap: {
 *             essential: 'functional',
 *             functional: 'functional',
 *             marketing: 'marketing',
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const sourceUsercentrics: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb } = env;

  // Resolve window with fallback to globalThis
  const actualWindow =
    env.window ??
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined);

  // Merge user settings with defaults
  const settings: Settings = {
    eventName: config?.settings?.eventName ?? 'ucEvent',
    categoryMap: config?.settings?.categoryMap ?? {},
    explicitOnly: config?.settings?.explicitOnly ?? true,
  };

  const fullConfig: Source.Config<Types> = { settings };

  // Track listener reference for cleanup
  let consentListener: ((e: Event) => void) | undefined;

  // Only setup if in browser environment
  if (actualWindow) {
    /**
     * Determine if ucCategory represents group-level consent.
     * Group-level: all values are booleans.
     * Service-level: some values are non-boolean (e.g., 'partial').
     */
    const isGroupLevel = (
      ucCategory: Record<string, boolean | unknown>,
    ): boolean => {
      return Object.values(ucCategory).every((val) => typeof val === 'boolean');
    };

    /**
     * Parse consent from Usercentrics event detail.
     *
     * Two modes:
     * 1. Group-level: ucCategory has all booleans -> use ucCategory as consent
     * 2. Service-level: ucCategory has non-booleans -> extract individual
     *    service keys from event.detail + boolean entries from ucCategory
     *
     * categoryMap is applied in both modes for ucCategory boolean entries.
     */
    const parseConsent = (
      detail: UsercentricsEventDetail,
    ): WalkerOS.Consent => {
      const state: WalkerOS.Consent = {};

      if (detail.ucCategory && isGroupLevel(detail.ucCategory)) {
        // Group-level consent: use ucCategory values
        Object.entries(detail.ucCategory).forEach(([category, value]) => {
          if (typeof value !== 'boolean') return;
          const mapped = settings.categoryMap?.[category] ?? category;
          // OR logic: if ANY source category is true, target group is true
          state[mapped] = state[mapped] || value;
        });
      } else {
        // Service-level consent: extract individual services
        // Include boolean entries from ucCategory (with categoryMap applied)
        if (detail.ucCategory) {
          Object.entries(detail.ucCategory).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
              const mapped = settings.categoryMap?.[key] ?? key;
              state[mapped] = state[mapped] || value;
            }
          });
        }

        // Extract service keys (not reserved keys)
        Object.entries(detail).forEach(([key, value]) => {
          if (RESERVED_KEYS.includes(key)) return;
          if (typeof value !== 'boolean') return;
          // Normalize: lowercase, spaces to underscores
          const normalized = key.toLowerCase().replace(/ /g, '_');
          state[normalized] = value;
        });
      }

      return state;
    };

    /**
     * Handle a Usercentrics consent event.
     */
    const handleConsent = (detail: UsercentricsEventDetail) => {
      // Only process consent_status events
      if (detail.event !== 'consent_status') return;

      // Skip implicit consent if explicitOnly is true
      // Use case-insensitive comparison (Usercentrics docs show both 'explicit' and 'EXPLICIT')
      if (settings.explicitOnly && detail.type?.toLowerCase() !== 'explicit')
        return;

      const state = parseConsent(detail);

      // Only call if we have consent state to report
      if (Object.keys(state).length > 0) {
        elb('walker consent', state);
      }
    };

    // Listen for Usercentrics consent events
    const eventName = settings.eventName ?? 'ucEvent';
    consentListener = (e: Event) => {
      const customEvent = e as CustomEvent<UsercentricsEventDetail>;
      if (customEvent.detail) {
        handleConsent(customEvent.detail);
      }
    };
    actualWindow.addEventListener(eventName, consentListener);
  }

  return {
    type: 'usercentrics',
    config: fullConfig,
    push: elb,
    destroy: async () => {
      if (actualWindow && consentListener) {
        const eventName = settings.eventName ?? 'ucEvent';
        actualWindow.removeEventListener(eventName, consentListener);
      }
    },
  };
};

export default sourceUsercentrics;
