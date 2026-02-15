import type { Source, WalkerOS } from '@walkeros/core';
import type {
  Types,
  Settings,
  CookieFirstConsent,
  CookieFirstAPI,
} from './types';

// Export types for external usage
export * as SourceCookieFirst from './types';

// Export examples
export * from './examples';

/**
 * Default category mapping from CookieFirst to walkerOS consent groups.
 *
 * Maps CookieFirst's standard categories to walkerOS convention:
 * - necessary/functional → functional (essential)
 * - performance → analytics (measurement)
 * - advertising → marketing (ads)
 */
export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  necessary: 'functional',
  functional: 'functional',
  performance: 'analytics',
  advertising: 'marketing',
};

/**
 * CookieFirst consent management source for walkerOS.
 *
 * This source listens to CookieFirst CMP events and translates
 * consent states to walkerOS consent commands.
 *
 * @example
 * ```typescript
 * import { sourceCookieFirst } from '@walkeros/web-source-cmp-cookiefirst';
 *
 * const collector = createCollector({
 *   sources: {
 *     consent: {
 *       code: sourceCookieFirst,
 *       config: {
 *         settings: {
 *           categoryMap: {
 *             performance: 'statistics', // Custom mapping
 *           },
 *         },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export const sourceCookieFirst: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb } = env;

  // Resolve window with fallback to globalThis
  const actualWindow =
    env.window ??
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined);

  // Merge user settings with defaults
  const settings: Settings = {
    categoryMap: { ...DEFAULT_CATEGORY_MAP, ...config?.settings?.categoryMap },
    explicitOnly: config?.settings?.explicitOnly ?? true,
    globalName: config?.settings?.globalName ?? 'CookieFirst',
  };

  const fullConfig: Source.Config<Types> = { settings };

  // Track listener references for cleanup
  let initListener: (() => void) | undefined;
  let consentListener: ((e: Event) => void) | undefined;

  // Only setup if in browser environment
  if (actualWindow) {
    /**
     * Handle consent state from CookieFirst.
     * Maps CookieFirst categories to walkerOS consent groups and calls elb.
     *
     * When multiple CookieFirst categories map to the same walkerOS group,
     * uses OR logic: if ANY category is true, the group is true.
     */
    const handleConsent = (consent: CookieFirstConsent | null) => {
      // Skip if explicitOnly and no explicit consent given
      if (settings.explicitOnly && !consent) return;
      if (!consent) return;

      // Map CookieFirst categories to walkerOS consent groups
      // Use OR logic: if ANY source category is true, the target group is true
      const state: WalkerOS.Consent = {};
      Object.entries(consent).forEach(([category, value]) => {
        if (typeof value !== 'boolean') return;
        const mapped = settings.categoryMap?.[category] ?? category;
        // OR logic: once true, stays true
        state[mapped] = state[mapped] || value;
      });

      // Only call if we have consent state to report
      if (Object.keys(state).length > 0) {
        elb('walker consent', state);
      }
    };

    const globalName = settings.globalName ?? 'CookieFirst';
    const cmp = actualWindow[globalName] as CookieFirstAPI | undefined;

    // Process existing consent if CMP already loaded
    if (cmp?.consent) {
      handleConsent(cmp.consent);
    }

    // Listen for CMP initialization
    initListener = () => {
      const cmp = actualWindow[globalName] as CookieFirstAPI | undefined;
      handleConsent(cmp?.consent ?? null);
    };
    actualWindow.addEventListener('cf_init', initListener);

    // Listen for consent changes
    consentListener = (e: Event) => {
      const customEvent = e as CustomEvent<CookieFirstConsent>;
      handleConsent(customEvent.detail);
    };
    actualWindow.addEventListener('cf_consent', consentListener);
  }

  return {
    type: 'cookiefirst',
    config: fullConfig,
    push: elb,
    destroy: async () => {
      // Remove event listeners on cleanup
      if (actualWindow && initListener) {
        actualWindow.removeEventListener('cf_init', initListener);
      }
      if (actualWindow && consentListener) {
        actualWindow.removeEventListener('cf_consent', consentListener);
      }
    },
  };
};

export default sourceCookieFirst;
